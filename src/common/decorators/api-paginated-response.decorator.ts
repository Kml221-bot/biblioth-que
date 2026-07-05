import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import { PaginationMetaDto, ResponseDto } from "../dto/response.dto";

export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel
) =>
  applyDecorators(
    ApiExtraModels(ResponseDto, PaginationMetaDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseDto) },
          {
            properties: {
              data: {
                type: "array",
                items: { $ref: getSchemaPath(model) },
              },
              meta: { $ref: getSchemaPath(PaginationMetaDto) },
            },
          },
        ],
      },
    })
  );
