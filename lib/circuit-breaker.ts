// lib/circuit-breaker.ts
// Circuit Breaker to protect Hetzner calls from cascading failures

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: CircuitState;
}

const circuits = new Map<string, CircuitStats>();

const DEFAULT_CONFIG = {
  failureThreshold: 5,      // open circuit after 5 failures
  successThreshold: 2,      // close after 2 successes in HALF_OPEN
  timeout: 60_000,          // wait 60s before HALF_OPEN
  halfOpenMaxCalls: 3,      // max calls in HALF_OPEN
};

function getCircuit(name: string): CircuitStats {
  if (!circuits.has(name)) {
    circuits.set(name, {
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      state: "CLOSED",
    });
  }
  return circuits.get(name)!;
}

function onSuccess(name: string): void {
  const circuit = getCircuit(name);
  circuit.failures = 0;

  if (circuit.state === "HALF_OPEN") {
    circuit.successes++;
    if (circuit.successes >= DEFAULT_CONFIG.successThreshold) {
      circuit.state = "CLOSED";
      circuit.successes = 0;
      console.log(`[circuit-breaker] ${name}: HALF_OPEN → CLOSED ✅`);
    }
  }
}

function onFailure(name: string): void {
  const circuit = getCircuit(name);
  circuit.failures++;
  circuit.lastFailureTime = Date.now();
  circuit.successes = 0;

  if (
    circuit.state === "CLOSED" &&
    circuit.failures >= DEFAULT_CONFIG.failureThreshold
  ) {
    circuit.state = "OPEN";
    console.error(`[circuit-breaker] ${name}: CLOSED → OPEN ❌ (${circuit.failures} failures)`);
  } else if (circuit.state === "HALF_OPEN") {
    circuit.state = "OPEN";
    circuit.lastFailureTime = Date.now();
    console.error(`[circuit-breaker] ${name}: HALF_OPEN → OPEN ❌`);
  }
}

function canCall(name: string): boolean {
  const circuit = getCircuit(name);

  if (circuit.state === "CLOSED") return true;

  if (circuit.state === "OPEN") {
    const elapsed = Date.now() - circuit.lastFailureTime;
    if (elapsed >= DEFAULT_CONFIG.timeout) {
      circuit.state = "HALF_OPEN";
      circuit.successes = 0;
      console.log(`[circuit-breaker] ${name}: OPEN → HALF_OPEN 🟡`);
      return true;
    }
    return false;
  }

  // HALF_OPEN: allow limited calls
  return true;
}

export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  if (!canCall(name)) {
    const circuit = getCircuit(name);
    const retryIn = Math.ceil((DEFAULT_CONFIG.timeout - (Date.now() - circuit.lastFailureTime)) / 1000);

    if (fallback) {
      console.warn(`[circuit-breaker] ${name}: OPEN — using fallback (retry in ${retryIn}s)`);
      return fallback();
    }

    throw new Error(
      `Service ${name} is temporarily unavailable. Circuit is OPEN. Retry in ${retryIn}s.`
    );
  }

  try {
    const result = await fn();
    onSuccess(name);
    return result;
  } catch (error) {
    onFailure(name);

    if (fallback) {
      console.warn(`[circuit-breaker] ${name}: call failed — using fallback`);
      return fallback();
    }
    throw error;
  }
}

export function getCircuitStatus(name: string): CircuitStats & { name: string } {
  return { name, ...getCircuit(name) };
}

export function getAllCircuitStatuses(): Array<CircuitStats & { name: string }> {
  return Array.from(circuits.entries()).map(([name, stats]) => ({ name, ...stats }));
}
