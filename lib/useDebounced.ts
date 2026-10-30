import { useEffect, useState } from "react";

/** A value that only changes once it has stayed put for `ms`: one request per pause, not per key or per pan. */
export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
