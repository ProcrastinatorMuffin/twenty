import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { useRecoilValue } from 'recoil';

import { useObjectMetadataItemOnly } from '@/object-metadata/hooks/useObjectMetadataItemOnly';
import { RecordTableBody } from '@/object-record/record-table/components/RecordTableBody';
import { RecordTableBodyEffect } from '@/object-record/record-table/components/RecordTableBodyEffect';
import { RecordTableHeader } from '@/object-record/record-table/components/RecordTableHeader';
import { RecordTableContext } from '@/object-record/record-table/contexts/RecordTableContext';
import { useRecordTableStates } from '@/object-record/record-table/hooks/internal/useRecordTableStates';
import { RecordTableScope } from '@/object-record/record-table/scopes/RecordTableScope';
import { MOBILE_VIEWPORT } from '@/ui/theme/constants/MobileViewport';
import { RGBA } from '@/ui/theme/constants/Rgba';
import { scrollLeftState } from '@/ui/utilities/scroll/states/scrollLeftState';

const StyledTable = styled.table<{ freezeFirstColumns?: boolean }>`
  border-radius: ${({ theme }) => theme.border.radius.sm};
  border-spacing: 0;
  margin-right: ${({ theme }) => theme.table.horizontalCellMargin};
  table-layout: fixed;

  width: calc(100% - ${({ theme }) => theme.table.horizontalCellMargin} * 2);

  th {
    border-block: 1px solid ${({ theme }) => theme.border.color.light};
    color: ${({ theme }) => theme.font.color.tertiary};
    padding: 0;
    text-align: left;

    :last-child {
      border-right-color: transparent;
    }
    :first-of-type {
      border-left-color: transparent;
      border-right-color: transparent;
    }
  }

  td {
    border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
    color: ${({ theme }) => theme.font.color.primary};
    padding: 0;
    border-right: 1px solid ${({ theme }) => theme.border.color.light};

    text-align: left;

    :last-child {
      border-right-color: transparent;
    }
    :first-of-type {
      border-left-color: transparent;
      border-right-color: transparent;
    }
  }

  th {
    background-color: ${({ theme }) => theme.background.primary};
    border-right: 1px solid ${({ theme }) => theme.border.color.light};
  }

  thead th:nth-of-type(-n + 2),
  tbody td:nth-of-type(-n + 2) {
    position: sticky;
    z-index: 2;
    border-right: none;
  }

  thead th:nth-of-type(1),
  tbody td:nth-of-type(1) {
    left: 0;
  }

  // Label identifier column
  thead th:nth-of-type(2),
  tbody td:nth-of-type(2) {
    left: calc(${({ theme }) => theme.table.checkboxColumnWidth} - 2px);

    ${({ freezeFirstColumns }) =>
      freezeFirstColumns &&
      css`
        @media (max-width: ${MOBILE_VIEWPORT}px) {
          width: 35px;
          max-width: 35px;
        }
      `}

    &::after {
      content: '';
      height: calc(100% + 1px);
      position: absolute;
      top: 0;
      width: 4px;
      right: -4px;

      ${({ freezeFirstColumns, theme }) =>
        freezeFirstColumns &&
        css`
          box-shadow: 4px 0px 4px -4px ${theme.name === 'dark'
              ? RGBA(theme.grayScale.gray50, 0.8)
              : RGBA(theme.grayScale.gray100, 0.25)} inset;
        `}
    }
  }

  thead th:nth-of-type(3),
  tbody td:nth-of-type(3) {
    border-left: 1px solid ${({ theme }) => theme.border.color.light};
  }
`;

type RecordTableProps = {
  recordTableId: string;
  objectNameSingular: string;
  onColumnsChange: (columns: any) => void;
  createRecord: () => void;
};

export const RecordTable = ({
  recordTableId,
  objectNameSingular,
  onColumnsChange,
  createRecord,
}: RecordTableProps) => {
  const { scopeId } = useRecordTableStates(recordTableId);
  const scrollLeft = useRecoilValue(scrollLeftState());

  const { objectMetadataItem } = useObjectMetadataItemOnly({
    objectNameSingular,
  });

  return (
    <RecordTableScope
      recordTableScopeId={scopeId}
      onColumnsChange={onColumnsChange}
    >
      {!!objectNameSingular && (
        <RecordTableContext.Provider
          value={{
            objectMetadataItem,
          }}
        >
          <StyledTable
            freezeFirstColumns={scrollLeft > 0}
            className="entity-table-cell"
          >
            <RecordTableHeader createRecord={createRecord} />
            <RecordTableBodyEffect objectNameSingular={objectNameSingular} />
            <RecordTableBody objectNameSingular={objectNameSingular} />
          </StyledTable>
        </RecordTableContext.Provider>
      )}
    </RecordTableScope>
  );
};
