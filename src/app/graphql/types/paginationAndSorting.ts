// ./src/app/graphql/types/paginationAndSorting.ts
const typeDefs = `#graphql
  "Sorting order: Ascending or Descending"
  enum OrderAscDesc {
    ASC
    DESC
  }

  "Pagination defines how many records to request and offset"
  input Pagination {
    "Page defines number of page to request"
    page: Int!
    "PageSize defines a number of records to return"
    pageSize: Int
  }

  "Sorting configuration item"
  input SortItem {
    "Name of field to sort"
    name: String!
    "Sort order"
    order: OrderAscDesc!
  }

  input PaginationAndSorting {
    pagination: Pagination
    sortBy: [SortItem!]
  }
`;

export default typeDefs;
