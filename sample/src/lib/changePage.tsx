type Listener = (value: number) => void;

const listeners = new Set<Listener>();
if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
        if (e.key === "kind") {
            notify(parseInt(e.newValue || "0", 10));
        }
    });
}
export function onChangePage(callback: Listener): () => void {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
}

function getKind(): number {
    if (typeof window !== "undefined") {
        return parseInt(localStorage.getItem("kind") || "0", 10);
    } else {
        return 0;
    }
}

export function setKind(newKind: number): void {
    typeof window !== "undefined" ? localStorage.setItem("kind", String(newKind)) : newKind;
    notify(newKind);
}

export function notify(count: number): void {
    listeners.forEach((cb) => cb(count));
}
export function getKindSync(): number {
    return getKind();
}