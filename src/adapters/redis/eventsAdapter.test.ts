import { describe, it, expect } from "vitest";
import type { RedisClient } from "./client.js";
import { createEventsAdapter } from "./eventsAdapter.js";
import * as app from "../../application/events.js";
import * as schemas from "../mcp/schemas.js";
import { buildChannelName } from "../../keys.js";

function createMockRedis(): RedisClient & {
  published: { channel: string; message: string }[];
  logStore: Map<string, string[]>;
} {
  const published: { channel: string; message: string }[] = [];
  const logStore = new Map<string, string[]>();
  return {
    published,
    logStore,
    async publish(channel: string, message: string) {
      published.push({ channel, message });
      const key = `chanlog:${channel}`;
      let list = logStore.get(key);
      if (!list) logStore.set(key, (list = []));
      list.push(message);
      return 0;
    },
    async rpush(key: string, ...values: string[]) {
      let list = logStore.get(key);
      if (!list) logStore.set(key, (list = []));
      list.push(...values);
      return list.length;
    },
    async llen(key: string) {
      return (logStore.get(key) ?? []).length;
    },
    async ltrim(key: string, _start: number, _stop: number) {
      const list = logStore.get(key) ?? [];
      if (list.length > 1000) logStore.set(key, list.slice(-1000));
    },
    async lrange(key: string, start: number, stop: number) {
      const list = logStore.get(key) ?? [];
      const len = list.length;
      const s = start < 0 ? Math.max(0, len + start) : start;
      const e = stop < 0 ? len + stop + 1 : stop + 1;
      return list.slice(s, e);
    },
    async ping() {
      return "PONG";
    },
    disconnect() {},
  } as unknown as RedisClient & {
    published: { channel: string; message: string }[];
    logStore: Map<string, string[]>;
  };
}

describe("publish_interagent_message", () => {
  it("publica mensaje y escribe en log", async () => {
    const redis = createMockRedis();
    const port = createEventsAdapter(redis);
    const input = schemas.publishInteragentMessageSchema.parse({
      channel: "backend_devs",
      sender_agent_key: "agent:arq_1",
      payload: "Necesito revisión del schema de usuarios",
    });
    const channelName = buildChannelName(input.channel);
    const result = await app.publishInteragentMessage(
      port,
      channelName,
      input.sender_agent_key,
      input.payload
    );
    expect(result.content[0].text).toContain("publicado");
    expect(redis.published.length).toBe(1);
    const parsed = JSON.parse(redis.published[0].message);
    expect(parsed.sender_agent_key).toBe("agent:arq_1");
    expect(parsed.payload).toBe("Necesito revisión del schema de usuarios");
  });
});

describe("get_channel_log", () => {
  it("devuelve mensaje cuando no hay log", async () => {
    const redis = createMockRedis();
    const port = createEventsAdapter(redis);
    const result = await app.getChannelLog(port, buildChannelName("empty_channel"), 10);
    expect(result.content[0].text).toContain("No hay mensajes");
  });
  it("devuelve últimos mensajes formateados", async () => {
    const redis = createMockRedis();
    const msg = JSON.stringify({
      ts: "2025-01-01T12:00:00Z",
      sender_agent_key: "agent:1",
      payload: "Hola",
    });
    redis.logStore.set("chanlog:channel:devs", [msg]);
    const port = createEventsAdapter(redis);
    const result = await app.getChannelLog(port, buildChannelName("devs"), 5);
    expect(result.content[0].text).toContain("agent:1");
    expect(result.content[0].text).toContain("Hola");
  });
});
