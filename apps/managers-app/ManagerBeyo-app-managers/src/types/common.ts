declare const _brand: unique symbol;

export type Branded<T, Brand extends string> = T & {
  readonly [_brand]: Brand;
};

export type UserId = Branded<string, 'UserId'>;
