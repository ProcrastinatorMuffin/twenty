import { DeleteQueryFactory } from 'src/api/rest/api-rest-query-builder/factories/delete-query.factory';
import { CreateQueryFactory } from 'src/api/rest/api-rest-query-builder/factories/create-query.factory';
import { UpdateQueryFactory } from 'src/api/rest/api-rest-query-builder/factories/update-query.factory';
import { FindOneQueryFactory } from 'src/api/rest/api-rest-query-builder/factories/find-one-query.factory';
import { FindManyQueryFactory } from 'src/api/rest/api-rest-query-builder/factories/find-many-query.factory';
import { DeleteVariablesFactory } from 'src/api/rest/api-rest-query-builder/factories/delete-variables.factory';
import { CreateVariablesFactory } from 'src/api/rest/api-rest-query-builder/factories/create-variables.factory';
import { UpdateVariablesFactory } from 'src/api/rest/api-rest-query-builder/factories/update-variables.factory';
import { GetVariablesFactory } from 'src/api/rest/api-rest-query-builder/factories/get-variables.factory';
import { LastCursorInputFactory } from 'src/api/rest/api-rest-query-builder/factories/input-factories/last-cursor-input.factory';
import { LimitInputFactory } from 'src/api/rest/api-rest-query-builder/factories/input-factories/limit-input.factory';
import { OrderByInputFactory } from 'src/api/rest/api-rest-query-builder/factories/input-factories/order-by-input.factory';
import { FilterInputFactory } from 'src/api/rest/api-rest-query-builder/factories/input-factories/filter-input.factory';

export const apiRestQueryBuilderFactories = [
  DeleteQueryFactory,
  CreateQueryFactory,
  UpdateQueryFactory,
  FindOneQueryFactory,
  FindManyQueryFactory,
  DeleteVariablesFactory,
  CreateVariablesFactory,
  UpdateVariablesFactory,
  GetVariablesFactory,
  LastCursorInputFactory,
  LimitInputFactory,
  OrderByInputFactory,
  FilterInputFactory,
];
