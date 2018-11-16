interface Store {
    get(key: string | number): Promise<string | number | null>;
    set(key: string | number, value: string | number): Promise<void>;
}

export default Store;