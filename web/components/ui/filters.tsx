import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Check,
  Circle,
  Tag,
  UserCircle,
  X,
  Clock,
  MapPin,
} from "lucide-react";
import { Dispatch, SetStateAction, useRef, useState, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";
import { Portuguese } from "flatpickr/dist/l10n/pt.js";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const observedHeight = entries[0].contentRect.height;
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <motion.div
      className={cn(className, "overflow-hidden")}
      style={{ height }}
      animate={{ height }}
      transition={{ duration: 0.1, dampping: 0.2, ease: "easeIn" }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

// Adaptado para MZNET
export enum FilterType {
  AREA = "Área",
  RESPONSAVEL = "Responsável", 
  PRAZO = "Prazo",
  HORARIO = "Horário",
  ATRIBUIDAS = "Atribuídas",
}

export enum FilterOperator {
  IS = "é",
  IS_NOT = "não é",
  IS_ANY_OF = "é qualquer um de",
  INCLUDE = "inclui",
  DO_NOT_INCLUDE = "não inclui",
  BEFORE = "antes de",
  AFTER = "depois de",
}

// Valores dos filtros MZNET
export enum Area {
  COMERCIAL = "Comercial",
  ANALISE = "Análise",
}

export enum Responsavel {
  TODOS = "Todos",
  // Será preenchido dinamicamente
}

export enum Prazo {
  DATA = "Escolher data",
}

export enum Horario {
  H0830 = "08:30",
  H1030 = "10:30", 
  H1330 = "13:30",
  H1530 = "15:30",
}

export enum Atribuidas {
  MINHAS_MENCOES = "Minhas menções",
}

export type FilterOption = {
  name: string;
  icon: React.ReactNode | undefined;
  label?: string;
  value?: string;
};

export type Filter = {
  id: string;
  type: FilterType;
  operator: FilterOperator;
  value: string[];
};

const FilterIcon = ({
  type,
}: {
  type: FilterType | Area | Responsavel | Prazo | Horario | Atribuidas;
}) => {
  switch (type) {
    case FilterType.AREA:
      return <MapPin className="size-4 text-muted-foreground" />;
    case FilterType.RESPONSAVEL:
      return <UserCircle className="size-4 text-muted-foreground" />;
    case FilterType.PRAZO:
      return <Calendar className="size-4 text-muted-foreground" />;
    case FilterType.HORARIO:
      return <Clock className="size-4 text-muted-foreground" />;
    case FilterType.ATRIBUIDAS:
      return <Tag className="size-4 text-muted-foreground" />;
    case Area.COMERCIAL:
      return <div className="bg-blue-400 rounded-full size-2.5" />;
    case Area.ANALISE:
      return <div className="bg-green-400 rounded-full size-2.5" />;
    case Responsavel.TODOS:
      return <UserCircle className="size-3.5 text-muted-foreground" />;
    case Prazo.DATA:
      return <Calendar className="size-3.5" />;
    case Horario.H0830:
    case Horario.H1030:
    case Horario.H1330:
    case Horario.H1530:
      return <Clock className="size-3.5 text-blue-400" />;
    case Atribuidas.MINHAS_MENCOES:
      return <div className="bg-orange-400 rounded-full size-2.5" />;
    default:
      return <Circle className="size-3.5" />;
  }
};

export const filterViewOptions: FilterOption[][] = [
  [
    {
      name: FilterType.AREA,
      icon: <FilterIcon type={FilterType.AREA} />,
    },
    {
      name: FilterType.RESPONSAVEL,
      icon: <FilterIcon type={FilterType.RESPONSAVEL} />,
    },
    {
      name: FilterType.PRAZO,
      icon: <FilterIcon type={FilterType.PRAZO} />,
    },
  ],
  [
    {
      name: FilterType.HORARIO,
      icon: <FilterIcon type={FilterType.HORARIO} />,
    },
    {
      name: FilterType.ATRIBUIDAS,
      icon: <FilterIcon type={FilterType.ATRIBUIDAS} />,
    },
  ],
];

export const areaFilterOptions: FilterOption[] = Object.values(Area).map(
  (area) => ({
    name: area,
    icon: <FilterIcon type={area} />,
  })
);

export const responsavelFilterOptions: FilterOption[] = [];

export const prazoFilterOptions: FilterOption[] = [];

export const horarioFilterOptions: FilterOption[] = Object.values(Horario).map(
  (horario) => ({
    name: horario,
    icon: <FilterIcon type={horario} />,
  })
);

export const atribuidasFilterOptions: FilterOption[] = [
  {
    name: Atribuidas.MINHAS_MENCOES,
    icon: <FilterIcon type={Atribuidas.MINHAS_MENCOES} />,
    value: "mentions",
  },
];

export const filterViewToFilterOptions: Record<FilterType, FilterOption[]> = {
  [FilterType.AREA]: areaFilterOptions,
  [FilterType.RESPONSAVEL]: responsavelFilterOptions,
  [FilterType.PRAZO]: prazoFilterOptions,
  [FilterType.HORARIO]: horarioFilterOptions,
  [FilterType.ATRIBUIDAS]: atribuidasFilterOptions,
};

const filterOperators = ({
  filterType,
  filterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
}) => {
  switch (filterType) {
    case FilterType.AREA:
    case FilterType.RESPONSAVEL:
    case FilterType.HORARIO:
      if (Array.isArray(filterValues) && filterValues.length > 1) {
        return [FilterOperator.IS_ANY_OF, FilterOperator.IS_NOT];
      } else {
        return [FilterOperator.IS, FilterOperator.IS_NOT];
      }
    case FilterType.ATRIBUIDAS:
      if (Array.isArray(filterValues) && filterValues.length > 1) {
        return [FilterOperator.IS_ANY_OF];
      } else {
        return [FilterOperator.IS];
      }
    case FilterType.PRAZO:
      return [FilterOperator.IS, FilterOperator.IS_NOT];
    default:
      return [FilterOperator.IS];
  }
};

const FilterOperatorDropdown = ({
  filterType,
  operator,
  filterValues,
  setOperator,
}: {
  filterType: FilterType;
  operator: FilterOperator;
  filterValues: string[];
  setOperator: (operator: FilterOperator) => void;
}) => {
  const operators = filterOperators({ filterType, filterValues });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-muted hover:bg-muted/50 px-1.5 py-1 text-muted-foreground hover:text-primary transition shrink-0">
        {operator}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit bg-white border-0 shadow-lg rounded-lg">
        {operators.map((operator) => (
          <DropdownMenuItem
            key={operator}
            onClick={() => setOperator(operator)}
          >
            {operator}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FilterValueCombobox = ({
  filterType,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

  const allOptions = useMemo(
    () => filterViewToFilterOptions[filterType] ?? [],
    [filterType]
  );

  const nonSelectedFilterValues = allOptions.filter(
    (filter) => !filterValues.includes(filter.value ?? filter.name)
  );

  const resolveOption = (value: string) =>
    allOptions.find((option) => (option.value ?? option.name) === value);

  const selectedOptions = filterValues.map((value) => ({
    value,
    option: resolveOption(value),
  }));

  const formatValueLabel = (value: string, option?: FilterOption) => {
    if (option?.name) return option.name;
    if (filterType === FilterType.PRAZO && value) {
      try {
        const [y, m, d] = value.split("-").map(Number);
        const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
        return new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(date);
      } catch {
        return value;
      }
    }
    return value;
  };

  if (filterType === FilterType.PRAZO) {
    const selected = filterValues[0];
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="rounded-none px-1.5 py-1 bg-muted hover:bg-muted/50 transition text-muted-foreground hover:text-primary shrink-0">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground" />
            {selected
              ? formatValueLabel(selected)
              : "Selecionar data"}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-3 bg-white border-0 shadow-lg rounded-lg">
          <div className="space-y-3">
            <Flatpickr
              value={selected ? new Date(selected) : undefined}
              options={{
                locale: Portuguese,
                dateFormat: "Y-m-d",
                defaultDate: selected,
              }}
              onChange={(dates) => {
                const [first] = dates;
                if (first) {
                  const iso = toYMD(first);
                  setFilterValues([iso]);
                } else {
                  setFilterValues([]);
                }
                setOpen(false);
              }}
              className="w-full rounded-md border border-muted px-3 py-2 text-sm"
            />
            <div className="flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterValues([]);
                  setOpen(false);
                }}
                className="h-8"
              >
                Limpar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8"
              >
                Fechar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setTimeout(() => {
            setCommandInput("");
          }, 200);
        }
      }}
    >
      <PopoverTrigger
        className="rounded-none px-1.5 py-1 bg-muted hover:bg-muted/50 transition
  text-muted-foreground hover:text-primary shrink-0"
      >
        <div className="flex gap-1.5 items-center">
          <div className="flex items-center flex-row -space-x-1.5">
            <AnimatePresence mode="popLayout">
              {selectedOptions.slice(0, 3).map(({ value, option }) => (
                <motion.div
                  key={value}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {option?.icon ?? <FilterIcon type={filterType} />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {filterValues?.length === 1
            ? formatValueLabel(
                selectedOptions[0]?.value ?? "",
                selectedOptions[0]?.option
              )
            : `${filterValues?.length} selecionados`}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-lg">
        <AnimateChangeInHeight>
          <Command className="rounded-lg">
            <CommandInput
              placeholder={filterType}
              className="h-9 !border-0 !border-b-0"
              value={commandInput}
              onInputCapture={(e) => {
                setCommandInput(e.currentTarget.value);
              }}
              ref={commandInputRef}
            />
            <CommandList>
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              <CommandGroup>
                {selectedOptions.map(({ value, option }) => (
                  <CommandItem
                    key={value}
                    className="group flex gap-2 items-center"
                    onSelect={() => {
                      setFilterValues(filterValues.filter((v) => v !== value));
                      setTimeout(() => {
                        setCommandInput("");
                      }, 200);
                      setOpen(false);
                    }}
                  >
                    <Checkbox checked={true} />
                    {option?.icon ?? <FilterIcon type={filterType} />}
                    {formatValueLabel(value, option)}
                  </CommandItem>
                ))}
              </CommandGroup>
              {nonSelectedFilterValues?.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {nonSelectedFilterValues.map((filter: FilterOption) => {
                      const storedValue = filter.value ?? filter.name;
                      return (
                        <CommandItem
                          className="group flex gap-2 items-center"
                          key={storedValue}
                          value={filter.name}
                          onSelect={() => {
                            if (filterValues.includes(storedValue)) {
                              setOpen(false);
                              return;
                            }
                            setFilterValues([...filterValues, storedValue]);
                          setTimeout(() => {
                            setCommandInput("");
                          }, 200);
                          setOpen(false);
                        }}
                        >
                          <Checkbox
                            checked={false}
                            className="opacity-0 group-data-[selected=true]:opacity-100"
                          />
                          {filter.icon}
                          <span className="text-accent-foreground">
                            {formatValueLabel(storedValue, filter)}
                          </span>
                          {filter.label && (
                            <span className="text-muted-foreground text-xs ml-auto">
                              {filter.label}
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Filters({
  filters,
  setFilters,
}: {
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
}) {
  return (
    <div className="flex gap-2">
      {filters
        .filter((filter) => filter.value?.length > 0)
        .map((filter) => (
          <div key={filter.id} className="flex gap-[1px] items-center text-xs">
            <div className="flex gap-1.5 shrink-0 rounded-l bg-muted px-1.5 py-1 items-center">
              <FilterIcon type={filter.type} />
              {filter.type}
            </div>
            <FilterOperatorDropdown
              filterType={filter.type}
              operator={filter.operator}
              filterValues={filter.value}
              setOperator={(operator) => {
                setFilters((prev) =>
                  prev.map((f) => (f.id === filter.id ? { ...f, operator } : f))
                );
              }}
            />
            <FilterValueCombobox
              filterType={filter.type}
              filterValues={filter.value}
              setFilterValues={(filterValues) => {
                setFilters((prev) =>
                  prev.map((f) =>
                    f.id === filter.id ? { ...f, value: filterValues } : f
                  )
                );
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFilters((prev) => prev.filter((f) => f.id !== filter.id));
              }}
              className="bg-muted rounded-l-none rounded-r-sm h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted/50 transition shrink-0"
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
    </div>
  );
}
