type _CamelToSnakeInner<S extends string> = S extends `${infer H}${infer T}`
  ? H extends Lowercase<H>
    ? `${H}${_CamelToSnakeInner<T>}`
    : `_${Lowercase<H>}${_CamelToSnakeInner<T>}`
  : S

type _TrimStartUnderscore<S extends string> = S extends `_${infer R}` ? R : S

export type CamelCaseToSnakeCaseString<S extends string> = _TrimStartUnderscore<
  _CamelToSnakeInner<S>
>

export type CamelCaseToSnakeCase<GenericObject> = {
  [
    ObjectProperty in keyof GenericObject as ObjectProperty extends string
      ? CamelCaseToSnakeCaseString<ObjectProperty>
      : ObjectProperty
  ]: GenericObject[ObjectProperty] extends Array<infer ArrayItem>
    ? ArrayItem extends Record<string, unknown>
      ? Array<CamelCaseToSnakeCase<ArrayItem>>
      : GenericObject[ObjectProperty]
    : GenericObject[ObjectProperty] extends Record<string, unknown>
      ? CamelCaseToSnakeCase<GenericObject[ObjectProperty]>
      : GenericObject[ObjectProperty]
}
