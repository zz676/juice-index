import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import {
  DEFAULT_CHART_CONFIG,
  type ChartConfig,
} from "@/components/explorer/ChartCustomizer";

const SHARE_VERSION = 1;
const EXPIRY_DAYS = 7;

export type ShareState = {
  prompt: string;
  queryJsonText: string;
  generatedSql: string;
  tableName: string;
  xField: string;
  yField: string;
  rawData: Record<string, unknown>[];
  chartData: { label: string; value: number }[];
  chartConfig: ChartConfig;
  postDraft: string;
};

type SharePayload = {
  v: number;
  ts: number;
  p: string;
  q: string;
  sql: string;
  tn: string;
  xf: string;
  yf: string;
  rd: Record<string, unknown>[];
  cd: { label: string; value: number }[];
  c: Partial<Record<string, unknown>>;
  pd: string;
};

/** Build a delta of chartConfig vs defaults (only non-default values). */
function deltaEncode(config: ChartConfig): Partial<Record<string, unknown>> {
  const delta: Partial<Record<string, unknown>> = {};
  const defaults = DEFAULT_CHART_CONFIG as unknown as Record<string, unknown>;
  const current = config as unknown as Record<string, unknown>;
  for (const key of Object.keys(defaults)) {
    if (current[key] !== defaults[key]) {
      delta[key] = current[key];
    }
  }
  return delta;
}

/** Merge delta back onto defaults to reconstruct full config. */
function deltaDecode(delta: Partial<Record<string, unknown>>): ChartConfig {
  return { ...DEFAULT_CHART_CONFIG, ...delta } as ChartConfig;
}

export function encodeShareState(state: ShareState): string {
  const payload: SharePayload = {
    v: SHARE_VERSION,
    ts: Math.floor(Date.now() / 1000),
    p: state.prompt,
    q: state.queryJsonText,
    sql: state.generatedSql,
    tn: state.tableName,
    xf: state.xField,
    yf: state.yField,
    rd: state.rawData,
    cd: state.chartData,
    c: deltaEncode(state.chartConfig),
    pd: state.postDraft,
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export type DecodeResult = {
  state: ShareState;
  expired: boolean;
};

export function decodeShareState(encoded: string): DecodeResult | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const payload = JSON.parse(json) as SharePayload;
    if (payload.v !== SHARE_VERSION) return null;

    const ageSec = Math.floor(Date.now() / 1000) - payload.ts;
    const expired = ageSec > EXPIRY_DAYS * 86400;

    return {
      state: {
        prompt: payload.p ?? "",
        queryJsonText: payload.q ?? "",
        generatedSql: payload.sql ?? "",
        tableName: payload.tn ?? "",
        xField: payload.xf ?? "",
        yField: payload.yf ?? "",
        rawData: payload.rd ?? [],
        chartData: payload.cd ?? [],
        chartConfig: deltaDecode(payload.c ?? {}),
        postDraft: payload.pd ?? "",
      },
      expired,
    };
  } catch {
    return null;
  }
}
