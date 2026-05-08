/**
 * Filter & Sort Controls
 * Reusable consistent UI for list filtering and sorting
 */

import { Search, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { cn } from "../lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface SortOption {
  value: string;
  label: string;
}

interface FilterSortProps {
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Filter
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  filterLabel?: string;

  // Sort
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: SortOption[];

  // Results count
  totalResults?: number;
  filteredResults?: number;
}

export function FilterSort({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filterValue = "all",
  onFilterChange,
  filterOptions = [],
  sortValue = "",
  onSortChange,
  sortOptions = [],
  totalResults,
  filteredResults,
}: FilterSortProps) {
  const showSearch = !!onSearchChange;
  const showFilter = filterOptions.length > 0 && onFilterChange;
  const showSort = sortOptions.length > 0 && onSortChange;
  const showResults = totalResults !== undefined && filteredResults !== undefined;

  return (
    <div className="space-y-4">
      {/* Top row: Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-background border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Bottom row: Filter, Sort, Results */}
      {(showFilter || showSort || showResults) && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter */}
          {showFilter && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1 bg-accent/50 rounded-lg p-1 border">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onFilterChange(option.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                      filterValue === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {option.label}
                    {option.count !== undefined && (
                      <span className="ml-1.5 opacity-70">({option.count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort */}
          {showSort && (
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortValue}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-accent/50 border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Results count */}
          {showResults && (
            <div className="ml-auto text-xs text-muted-foreground">
              {filteredResults === totalResults ? (
                <span>
                  {totalResults} {totalResults === 1 ? "result" : "results"}
                </span>
              ) : (
                <span>
                  {filteredResults} of {totalResults} results
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
