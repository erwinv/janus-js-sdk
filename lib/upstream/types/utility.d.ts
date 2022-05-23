// How to define the type of the comma-separated combinations of a string literal union type.
// Answer by M.H. Alahdadian: https://stackoverflow.com/a/65157132

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never
type UnionToOvlds<U> = UnionToIntersection<
  U extends any ? (f: U) => void : never // eslint-disable-line @typescript-eslint/no-explicit-any
>

type PopUnion<U> = UnionToOvlds<U> extends (a: infer A) => void ? A : never

type UnionConcat<
  U extends string,
  Sep extends string
> = PopUnion<U> extends infer SELF
  ? SELF extends string
    ? Exclude<U, SELF> extends never
      ? SELF
      :
          | `${UnionConcat<Exclude<U, SELF>, Sep>}${Sep}${SELF}`
          | UnionConcat<Exclude<U, SELF>, Sep>
          | SELF
    : never
  : never
