import { Injectable } from '@nestjs/common';

import { GraphQLObjectType } from 'graphql';

import { WorkspaceBuildSchemaOptions } from 'src/engine/graphql/workspace-schema-builder/interfaces/workspace-build-schema-optionts.interface';
import { WorkspaceResolverBuilderQueryMethodNames } from 'src/engine/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { ObjectMetadataInterface } from 'src/engine-metadata/field-metadata/interfaces/object-metadata.interface';

import { ObjectTypeName, RootTypeFactory } from './root-type.factory';

@Injectable()
export class QueryTypeFactory {
  constructor(private readonly rootTypeFactory: RootTypeFactory) {}

  create(
    objectMetadataCollection: ObjectMetadataInterface[],
    workspaceResolverMethodNames: WorkspaceResolverBuilderQueryMethodNames[],
    options: WorkspaceBuildSchemaOptions,
  ): GraphQLObjectType {
    return this.rootTypeFactory.create(
      objectMetadataCollection,
      workspaceResolverMethodNames,
      ObjectTypeName.Query,
      options,
    );
  }
}
