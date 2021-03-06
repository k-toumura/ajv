/** required keys of an object, not undefined */
type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K
}[keyof T]

/** optional or undifined-able keys of an object */
type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never
}[keyof T]

/** type is true if T is a union type */
type IsUnion_<T, U extends T = T> = false extends (
  T extends unknown ? ([U] extends [T] ? false : true) : never
)
  ? false
  : true
type IsUnion<T> = IsUnion_<T>

/** type is true if T is identically E */
type TypeEquality<T, E> = [T] extends [E] ? ([E] extends [T] ? true : false) : false

/** gets only the string literals of a type or null if a type isn't a string literal */
type EnumString<T> = [T] extends [never]
  ? null
  : T extends string
  ? string extends T
    ? null
    : T
  : null

/** true only if all types are array types (not tuples) */
// NOTE relies on the fact that tuples don't have an index at 0.5, but arrays
// have an index at every number
type IsElements<T> = [T] extends [readonly unknown[]]
  ? undefined extends T[0.5]
    ? false
    : true
  : false

/** numeric strings */
type NumberType = "float32" | "float64" | "int8" | "uint8" | "int16" | "uint16" | "int32" | "uint32"

/** string strings */
type StringType = "string" | "timestamp"

/** actual schema */
export type JTDSchemaType<T, D extends Record<string, unknown> = Record<string, never>> = (
  | // refs - where null wasn't specified, must match exactly
  ({[K in keyof D]: [T] extends [D[K]] ? {ref: K} : never}[keyof D] & {nullable?: false})
  // nulled refs - if ref is nullable and nullable is specified, then it can
  // match either null or non-null definitions
  | (null extends T
      ? {
          [K in keyof D]: [Exclude<T, null>] extends [Exclude<D[K], null>] ? {ref: K} : never
        }[keyof D] & {nullable: true}
      : never)
  // all other types
  | ((
      | // numbers - only accepts the type number
      (true extends TypeEquality<Exclude<T, null>, number> ? {type: NumberType} : never)
      // booleans - accepts the type boolean
      | (true extends TypeEquality<Exclude<T, null>, boolean> ? {type: "boolean"} : never)
      // strings - only accepts the type string
      | (true extends TypeEquality<Exclude<T, null>, string> ? {type: StringType} : never)
      // strings - only accepts the type Date
      | (true extends TypeEquality<Exclude<T, null>, Date> ? {type: "timestamp"} : never)
      // enums - only accepts union of string literals
      // TODO we can't actually check that everything in the union was specified
      | (null extends EnumString<Exclude<T, null>> ? never : {enum: EnumString<Exclude<T, null>>[]})
      // arrays - only accepts arrays, could be array of unions to be resolved later
      | (false extends IsUnion<Exclude<T, null>>
          ? true extends IsElements<Exclude<T, null>>
            ? T extends readonly (infer E)[]
              ? {
                  elements: JTDSchemaType<E, D>
                }
              : never
            : never
          : never)
      // values
      | (false extends IsUnion<Exclude<T, null>>
          ? true extends TypeEquality<keyof Exclude<T, null>, string>
            ? T extends Record<string, infer V>
              ? {
                  values: JTDSchemaType<V>
                }
              : never
            : never
          : never)
      // properties
      | (false extends IsUnion<Exclude<T, null>>
          ? null extends EnumString<keyof Exclude<T, null>>
            ? never
            : ([RequiredKeys<Exclude<T, null>>] extends [never]
                ? {
                    properties?: Record<string, never>
                  }
                : {
                    properties: {[K in RequiredKeys<T>]: JTDSchemaType<T[K], D>}
                  }) &
                ([OptionalKeys<Exclude<T, null>>] extends [never]
                  ? {
                      optionalProperties?: Record<string, never>
                    }
                  : {
                      optionalProperties: {
                        [K in OptionalKeys<T>]: JTDSchemaType<Exclude<T[K], undefined>, D>
                      }
                    }) & {
                  additionalProperties?: boolean
                }
          : never)
      // discriminator
      | (true extends IsUnion<Exclude<T, null>>
          ? null extends EnumString<keyof Exclude<T, null>>
            ? never
            : {
                [K in keyof Exclude<T, null>]-?: Exclude<T, null>[K] extends string
                  ? {
                      discriminator: K
                      mapping: {
                        // TODO currently allows descriminator to be present in schema
                        [M in Exclude<T, null>[K]]: JTDSchemaType<
                          Omit<T extends {[C in K]: M} ? T : never, K>,
                          D
                        >
                      }
                    }
                  : never
              }[keyof Exclude<T, null>]
          : never)
      // empty schema
      // NOTE there should only be one type that extends Record<string, never> so unions
      // shouldn't be a worry
      | (T extends Record<string, never> ? unknown : never)
      // null
      // NOTE we have to check this too because null as an exclusive type also
      // qualifies for the empty schema
      | (true extends TypeEquality<T, null> ? unknown : never)
    ) &
      (null extends T
        ? {
            nullable: true
          }
        : {nullable?: false}))
) & {
  // extra properties
  metadata?: Record<string, unknown>
  // TODO these should only be allowed at the top level
  definitions?: {[K in keyof D]: JTDSchemaType<D[K], D>}
}
