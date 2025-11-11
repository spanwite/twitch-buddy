export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PickByValue<Object, Value> = {
	[K in keyof Object as Object[K] extends Value ? K : never]: Object[K];
};
