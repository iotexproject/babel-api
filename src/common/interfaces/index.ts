
export * from './router.interface';

export interface Pagination {
  page?: number;
  pageSize?: number;
}

export interface TimeRange {
  startTime?: number;
  endTime?: number;
}

export interface InviteCondition {
  [key: string]: number;
}

export interface WhereMatching {
  value: string;
  exact: boolean;
}
