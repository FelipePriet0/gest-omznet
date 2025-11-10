"use client";

import { Button } from "@/components/ui/button";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar, ListFilter } from "lucide-react";
import { nanoid } from "nanoid";
import * as React from "react";
import { AnimateChangeInHeight } from "@/components/ui/filters";
import Filters from "@/components/ui/filters";
import {
  Filter,
  FilterOperator,
  FilterOption,
  FilterType,
  filterViewOptions,
  filterViewToFilterOptions,
} from "@/components/ui/filters";
import { type DateRangeValue } from "@/components/ui/date-range-popover";
import { KanbanRangeCalendar } from "@/components/app/kanban-range-calendar";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type CachedResponsavel = {
  id: string | null;
  full_name: string | null;
  role: string | null;
};

export type AppliedFilters = {
  responsaveis: string[];
  prazo?: { start: string; end?: string };
  hora?: string;
  atribuicao?: "mentions";
};

function getResponsavelIcon(name: string | undefined | null) {
  if (!name) return undefined;
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <Avatar className="h-6 w-6 text-xs">
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

function buildResponsavelOptions(profiles: CachedResponsavel[]): FilterOption[] {
  return profiles
    .filter((profile) => !!profile.id)
    .map((profile) => ({
      name: profile.full_name ?? "—",
      icon: getResponsavelIcon(profile.full_name ?? undefined),
      label: profile.role ?? undefined,
      value: profile.id ?? undefined,
    }));
}

export function FilterCTA({
  area = "comercial",
  onFiltersChange,
}: {
  area?: "comercial" | "analise";
  onFiltersChange?: (filters: AppliedFilters) => void;
} = {}) {
  const [open, setOpen] = React.useState(false);
  const [selectedView, setSelectedView] = React.useState<FilterType | null>(
    null
  );
  const [commandInput, setCommandInput] = React.useState("");
  const commandInputRef = React.useRef<HTMLInputElement>(null);
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [, setResponsavelOptions] = React.useState<FilterOption[]>(
    filterViewToFilterOptions[FilterType.RESPONSAVEL]
  );
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [popoverRect, setPopoverRect] = React.useState<DOMRect | null>(null);
  const calendarContainerRef = React.useRef<HTMLDivElement | null>(null);
  const popoverContentRef = React.useRef<HTMLDivElement | null>(null);
  const updatePopoverRect = React.useCallback(() => {
    if (popoverContentRef.current) {
      setPopoverRect(popoverContentRef.current.getBoundingClientRect());
    }
  }, []);
  const handleCalendarInteractOutside = React.useCallback(
    (event: Event) => {
      const customEvent = event as unknown as {
        target: EventTarget;
        detail?: { originalEvent?: Event };
        preventDefault: () => void;
      };
      const originalEvent = customEvent.detail?.originalEvent ?? (event as Event);
      const target = (originalEvent?.target ?? customEvent.target) as Node | null;
      if (target && calendarContainerRef.current?.contains(target)) {
        customEvent.preventDefault();
      }
    },
    []
  );

  const animationFrameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!open && !calendarOpen) return;
    updatePopoverRect();
    if (!calendarOpen) return;
    let observer: ResizeObserver | null = null;
    if (typeof window !== "undefined") {
      observer = new ResizeObserver(() => {
        updatePopoverRect();
      });
      if (popoverContentRef.current) {
        observer.observe(popoverContentRef.current);
      }
      window.addEventListener("resize", updatePopoverRect);
      window.addEventListener("scroll", updatePopoverRect, true);
      const loop = () => {
        updatePopoverRect();
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    }
    return () => {
      observer?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", updatePopoverRect);
        window.removeEventListener("scroll", updatePopoverRect, true);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    };
  }, [calendarOpen, open, updatePopoverRect]);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    let mounted = true;

    async function loadResponsaveis() {
      const areaRole = area === "analise" ? "analista" : "vendedor";

      try {
        const cacheKey = `responsavel-options-${areaRole}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as CachedResponsavel[];
            const options = buildResponsavelOptions(parsed);
            if (options.length > 0) {
              if (mounted) {
                filterViewToFilterOptions[FilterType.RESPONSAVEL] = options;
                setResponsavelOptions(options);
              }
              return;
            }
          } catch (error) {
            console.warn("Falha ao interpretar cache de responsáveis:", error);
          }
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("role", areaRole)
          .order("full_name");

        if (error) throw error;

        const cachedProfiles: CachedResponsavel[] = (data || []).map((profile) => ({
          id: profile.id ?? null,
          full_name: profile.full_name ?? null,
          role: profile.role ?? null,
        }));

        const options = buildResponsavelOptions(cachedProfiles);

        if (mounted) {
          filterViewToFilterOptions[FilterType.RESPONSAVEL] = options;
          setResponsavelOptions(options);
          sessionStorage.setItem(cacheKey, JSON.stringify(cachedProfiles));
        }
      } catch (error) {
        console.error("Falha ao carregar responsáveis para filtro:", error);
        if (mounted) {
          const fallback = buildResponsavelOptions([]);
          filterViewToFilterOptions[FilterType.RESPONSAVEL] = fallback;
          setResponsavelOptions(fallback);
        }
      }
    }

    loadResponsaveis();

    return () => {
      mounted = false;
    };
  }, [area, pathname]);

  // Inicializa a UI a partir da URL (?hora, ?prazo, ?prazo_fim)
  React.useEffect(() => {
    const initial: Filter[] = [];
    const hora = searchParams.get("hora");
    const prazoInicio = searchParams.get("prazo");
    const prazoFim = searchParams.get("prazo_fim");
    const responsavel = searchParams.get("responsavel");
    const atribuicao = searchParams.get("atribuicao");

    if (hora) {
      initial.push({
        id: "hora",
        type: FilterType.HORARIO,
        operator: FilterOperator.IS,
        value: [hora.length === 5 ? hora : hora.slice(0, 5)],
      });
    }

    if (prazoInicio) {
      const start = prazoInicio.trim();
      const end = prazoFim?.trim();
      if (start) {
        const values =
          end && end !== start
            ? (start < end ? [start, end] : [end, start])
            : [start];
        initial.push({
          id: "prazo",
          type: FilterType.PRAZO,
          operator: FilterOperator.IS,
          value: values,
        });
      }
    }

    if (responsavel) {
      const ids = responsavel
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        initial.push({
          id: "responsavel",
          type: FilterType.RESPONSAVEL,
          operator: FilterOperator.IS,
          value: ids,
        });
      }
    }

    if (atribuicao === "mentions") {
      initial.push({
        id: "atribuicao",
        type: FilterType.ATRIBUIDAS,
        operator: FilterOperator.IS,
        value: ["mentions"],
      });
    }
    setFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchParamsStr = React.useMemo(() => searchParams?.toString() ?? "", [searchParams]);

  const prazoFilter = React.useMemo(
    () => filters.find((f) => f.type === FilterType.PRAZO),
    [filters]
  );
  const prazoValues = prazoFilter?.value ?? [];
  const prazoStartValue = prazoValues[0];
  const prazoEndValue = prazoValues[1];

  const prazoRange = React.useMemo<DateRangeValue>(() => {
    return {
      start: prazoStartValue,
      end: prazoEndValue,
    };
  }, [prazoStartValue, prazoEndValue]);

  const handlePrazoChange = React.useCallback(
    (next: DateRangeValue) => {
      const nextStart = next.start?.trim();
      const nextEnd = next.end?.trim();
      setFilters((prev) => {
        const index = prev.findIndex((f) => f.type === FilterType.PRAZO);
        if (!nextStart) {
          if (index === -1) return prev;
          const clone = [...prev];
          clone.splice(index, 1);
          return clone;
        }
        const inOrder =
          nextEnd && nextStart && nextEnd < nextStart ? [nextEnd, nextStart] : [nextStart, nextEnd];
        const sanitized = inOrder.filter(Boolean) as string[];
        if (index === -1) {
          return [
            ...prev,
            {
              id: "prazo",
              type: FilterType.PRAZO,
              operator: FilterOperator.IS,
              value: sanitized.length === 1 ? [sanitized[0]] : sanitized,
            },
          ];
        }
        const clone = [...prev];
        clone[index] = {
          ...clone[index],
          value: sanitized.length === 1 ? [sanitized[0]] : sanitized,
        };
        return clone;
      });
    },
    [setFilters]
  );

  // Aplica efeitos dos filtros na URL (igual ao FilterBar antigo)
  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsStr);

    // Hora
    const horaFilter = filters.find((f) => f.type === FilterType.HORARIO);
    const hora = horaFilter?.value?.[0];
    if (hora) {
      params.set("hora", hora);
    } else {
      params.delete("hora");
    }

    // Prazo (dia único ou intervalo)
    if (prazoStartValue) {
      params.set("prazo", prazoStartValue);
    } else {
      params.delete("prazo");
    }

    if (prazoEndValue) {
      params.set("prazo_fim", prazoEndValue);
    } else {
      params.delete("prazo_fim");
    }

    const responsavelFilter = filters.find(
      (f) => f.type === FilterType.RESPONSAVEL
    );
    const responsavelIds = Array.from(
      new Set(responsavelFilter?.value?.filter(Boolean) ?? [])
    );

    if (responsavelIds.length > 0) {
      params.set("responsavel", responsavelIds.join(","));
    } else {
      params.delete("responsavel");
    }

    const atribuicaoFilter = filters.find(
      (f) => f.type === FilterType.ATRIBUIDAS
    );
    const hasMentions = atribuicaoFilter?.value?.includes("mentions") ?? false;

    if (hasMentions) {
      params.set("atribuicao", "mentions");
    } else {
      params.delete("atribuicao");
    }

    onFiltersChange?.({
      responsaveis: responsavelIds,
      prazo: prazoStartValue
        ? { start: prazoStartValue, end: prazoEndValue }
        : undefined,
      hora,
      atribuicao: hasMentions ? "mentions" : undefined,
    });

    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "";
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl);
    }
  }, [filters, router, pathname, searchParamsStr, onFiltersChange]);

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <Filters filters={filters} setFilters={setFilters} />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setCalendarOpen(false);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "transition-all duration-200 group h-9 text-sm items-center flex gap-1.5 filter-cta-hover",
              filters.length > 0 && "w-9"
            )}
            style={{ paddingLeft: "18px", paddingRight: "18px", borderRadius: "10px" }}
          >
            <ListFilter className="size-6 shrink-0 transition-all text-muted-foreground filter-icon" />
            {filters.length === 0 && "Filtros"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={popoverContentRef}
          className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-lg popover-content"
          side="right"
          align="start"
          sideOffset={12}
          onInteractOutside={handleCalendarInteractOutside}
          onPointerDownOutside={handleCalendarInteractOutside}
          onFocusOutside={handleCalendarInteractOutside}
        >
          <AnimateChangeInHeight>
            <Command className="rounded-lg">
              <CommandInput
                placeholder="Filtros..."
                className="h-9 !border-0 !border-b-0 command-input"
                value={commandInput}
                onInputCapture={(e) => {
                  setCommandInput(e.currentTarget.value);
                }}
                ref={commandInputRef}
              />
              <CommandList className="p-1">
                {selectedView && (
                  <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                )}
                {selectedView ? (
                  <CommandGroup className="p-0">
                    {(filterViewToFilterOptions[selectedView] ?? []).map(
                      (filter: FilterOption) => {
                        const storedValue = filter.value ?? filter.name;
                        return (
                          <CommandItem
                            className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1 command-item"
                            key={storedValue}
                            value={filter.name}
                            onSelect={() => {
                              if (selectedView === FilterType.AREA) {
                                const toAnalise = filter.name
                                  .toLowerCase()
                                  .includes("análise") || filter.name
                                  .toLowerCase()
                                  .includes("analise");
                                router.push(toAnalise ? "/kanban/analise" : "/kanban");
                              } else {
                                setFilters((prev) => {
                                  const index = prev.findIndex(
                                    (f) => f.type === selectedView
                                  );
                                  if (index >= 0) {
                                    const next = [...prev];
                                    const existing = next[index];
                                    const nextValues = Array.from(
                                      new Set([...(existing.value ?? []), storedValue])
                                    );
                                    next[index] = {
                                      ...existing,
                                      value: nextValues,
                                    };
                                    return next;
                                  }
                                  return [
                                    ...prev,
                                    {
                                      id: nanoid(),
                                      type: selectedView,
                                      operator: FilterOperator.IS,
                                      value: [storedValue],
                                    },
                                  ];
                                });
                              }
                              setTimeout(() => {
                                setSelectedView(null);
                                setCommandInput("");
                              }, 200);
                              setOpen(false);
                            }}
                          >
                            {filter.icon}
                            <span className="text-sm font-medium">
                              {filter.name}
                            </span>
                            {filter.label && (
                              <span className="text-muted-foreground text-xs ml-auto">
                                {filter.label}
                              </span>
                            )}
                          </CommandItem>
                        );
                      }
                    )}
                  </CommandGroup>
                ) : (
                  <>
                    <CommandGroup className="p-0">
                      {filterViewOptions
                        .flat()
                        .filter((filter: FilterOption) => filter.name !== FilterType.PRAZO)
                        .map((filter: FilterOption) => (
                          <CommandItem
                            className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1 command-item"
                            key={filter.name}
                            value={filter.name}
                            onSelect={(currentValue) => {
                              setSelectedView(currentValue as FilterType);
                              setCommandInput("");
                              commandInputRef.current?.focus();
                              setCalendarOpen(false);
                            }}
                          >
                            {filter.icon}
                            <span className="text-sm font-medium">
                              {filter.name}
                            </span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                    <CommandItem
                      value="toggle-calendar"
                      className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1 command-item"
                      onSelect={() => setCalendarOpen((prev) => !prev)}
                    >
                      <Calendar className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {calendarOpen ? "Fechar calendário" : "Selecionar período"}
                      </span>
                    </CommandItem>
                  </>
                )}
              </CommandList>
            </Command>
          </AnimateChangeInHeight>
        </PopoverContent>
      </Popover>
      {calendarOpen && (
        <div
          ref={calendarContainerRef}
          className="z-[99]"
          style={
            popoverRect
              ? {
                  position: "fixed",
                  top: popoverRect.top,
                  left: popoverRect.right + 16,
                }
              : undefined
          }
        >
          <KanbanRangeCalendar
            value={prazoRange}
            onChange={(next) => {
              handlePrazoChange(next);
            }}
          />
        </div>
      )}
    </div>
  );
}

