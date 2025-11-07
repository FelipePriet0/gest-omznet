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
import { Dispatch, SetStateAction, useRef, useState, useEffect } from "react";
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

const FilterOperatorDropdown = () => null;

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

  const allOptions = filterViewToFilterOptions[filterType] ?? [];

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
        <PopoverTrigger className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full text-current hover:bg-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition">
          <Calendar className="size-3.5 text-current" />
          {selected ? formatValueLabel(selected) : "Selecionar data"}
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
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setFilterValues([]);
                  setOpen(false);
                }}
              >
                Limpar
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
      <PopoverTrigger className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full text-current hover:bg-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition">
        <div className="flex items-center gap-1">
          <div className="flex items-center -space-x-1.5">
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
          <span>
            {filterValues?.length === 1
              ? formatValueLabel(
                  selectedOptions[0]?.value ?? "",
                  selectedOptions[0]?.option
                )
              : `${filterValues?.length} selecionados`}
          </span>
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
          <div
            key={filter.id}
            className="inline-flex items-center gap-2 rounded-none px-3 py-1 text-white shadow-sm text-xs"
            style={{
              backgroundColor: "var(--color-primary)",
              border: "1px solid var(--color-primary)",
            }}
          >
            <div className="inline-flex items-center gap-1">
              <FilterIcon type={filter.type} />
              <span className="font-semibold">{filter.type}</span>
            </div>
            <FilterValueCombobox
              filterType={filter.type}
              filterValues={filter.value}
              setFilterValues={(filterValues) => {
                setFilters((prev) =>
                  prev.map((f) =>
                    f.id === filter.id
                      ? { ...f, value: filterValues, operator: FilterOperator.IS }
                      : f
                  )
                );
              }}
            />
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => prev.filter((f) => f.id !== filter.id));
              }}
              className="inline-flex h-5 w-5 items-center justify-center rounded-none text-white transition"
              style={{
                backgroundColor: "var(--color-primary)",
                border: "1px solid transparent",
              }}
              aria-label={`Remover filtro ${filter.type}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
    </div>
  );
}
