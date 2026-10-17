import "server-only";

import { createSearchParamsCache } from "nuqs/server";

import { filterParsers, locationParsers } from "./filters";

export const filtersCache = createSearchParamsCache(filterParsers);
export const locationCache = createSearchParamsCache(locationParsers);
