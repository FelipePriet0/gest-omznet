"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, Calendar, ListFilter, AtSign, X as XIcon } from "lucide-react";
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
import { TABLE_PROFILES } from "@/lib/constants";
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
  myMentions?: boolean;
  searchTerm?: string;
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
  const seen = new Set<string>();
  const unique: CachedResponsavel[] = [];
  for (const p of profiles) {
    const id = p.id ?? undefined;
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(p);
  }
  return unique.map((profile) => ({
    name: profile.full_name ?? "—",
    icon: getResponsavelIcon(profile.full_name ?? undefined),
    label: profile.role ?? undefined,
    value: profile.id ?? undefined,
  }));
}

// Evita recriar o array padrão a cada render, causando loops em effects
const DEFAULT_ALLOWED_TYPES: FilterType[] = [
  FilterType.BUSCAR,
  FilterType.AREA,
  FilterType.RESPONSAVEL,
  FilterType.PRAZO,
  FilterType.HORARIO,
];

export function FilterCTA({
  area = "comercial",
  onFiltersChange,
  allowedTypes,
  showMentions = true,
}: {
  area?: "comercial" | "analise";
  onFiltersChange?: (filters: AppliedFilters) => void;
  allowedTypes?: FilterType[];
  showMentions?: boolean;
} = {}) {
  // Usa referência estável para os tipos permitidos
  const allowedTypesResolved = React.useMemo(
    () => allowedTypes ?? DEFAULT_ALLOWED_TYPES,
    [allowedTypes]
  );
  const allowedKey = React.useMemo(
    () => (allowedTypesResolved || []).join(","),
    [allowedTypesResolved]
  );
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
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchFilter = React.useMemo(
    () => filters.find((f) => f.type === FilterType.BUSCAR),
    [filters]
  );
  const [searchDraft, setSearchDraft] = React.useState(
    () => searchFilter?.value?.[0] ?? ""
  );
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
          .from(TABLE_PROFILES)
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

    if (allowedTypesResolved.includes(FilterType.RESPONSAVEL)) {
      loadResponsaveis();
    }

    return () => {
      mounted = false;
    };
  }, [area, pathname, allowedKey]);

  // Inicializa a UI a partir da URL (?hora, ?prazo, ?prazo_fim)
  React.useEffect(() => {
    const initial: Filter[] = [];
    const hora = searchParams.get("hora");
    const prazoInicio = searchParams.get("prazo");
    const prazoFim = searchParams.get("prazo_fim");
    const responsavel = searchParams.get("responsavel");
    const busca = searchParams.get("busca");

    if (hora && allowedTypesResolved.includes(FilterType.HORARIO)) {
      initial.push({
        id: "hora",
        type: FilterType.HORARIO,
        operator: FilterOperator.IS,
        value: [hora.length === 5 ? hora : hora.slice(0, 5)],
      });
    }

    if (prazoInicio && allowedTypesResolved.includes(FilterType.PRAZO)) {
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

    if (responsavel && allowedTypesResolved.includes(FilterType.RESPONSAVEL)) {
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

    if (busca && allowedTypesResolved.includes(FilterType.BUSCAR)) {
      const trimmed = busca.trim();
      if (trimmed.length > 0) {
        initial.push({
          id: "buscar",
          type: FilterType.BUSCAR,
          operator: FilterOperator.INCLUDE,
          value: [trimmed],
        });
      }
    }

    setFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchParamsStr = React.useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const [myMentions, setMyMentions] = React.useState<boolean>(() => (showMentions && searchParams.get('minhas_mencoes') === '1'));
  React.useEffect(() => {
    if (selectedView === FilterType.BUSCAR) {
      setSearchDraft(searchFilter?.value?.[0] ?? "");
      const id = requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    return;
  }, [selectedView, searchFilter]);

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

  const handleApplySearch = React.useCallback(() => {
    const trimmed = searchDraft.trim();
    setFilters((prev) => {
      const index = prev.findIndex((f) => f.type === FilterType.BUSCAR);
      if (!trimmed) {
        if (index === -1) return prev;
        const clone = [...prev];
        clone.splice(index, 1);
        return clone;
      }
      if (index === -1) {
        return [
          ...prev,
          {
            id: "buscar",
            type: FilterType.BUSCAR,
            operator: FilterOperator.INCLUDE,
            value: [trimmed],
          },
        ];
      }
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        operator: FilterOperator.INCLUDE,
        value: [trimmed],
      };
      return clone;
    });
    setSearchDraft(trimmed);
    setSelectedView(null);
    setCommandInput("");
    setOpen(false);
  }, [searchDraft, setFilters, setSelectedView, setCommandInput, setOpen]);

  const handleClearSearch = React.useCallback(() => {
    setSearchDraft("");
    setFilters((prev) => prev.filter((f) => f.type !== FilterType.BUSCAR));
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [setFilters]);

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

    const searchTerm = searchFilter?.value?.[0]?.trim();

    if (responsavelIds.length > 0) {
      params.set("responsavel", responsavelIds.join(","));
    } else {
      params.delete("responsavel");
    }

    onFiltersChange?.({
      responsaveis: responsavelIds,
      prazo: prazoStartValue
        ? { start: prazoStartValue, end: prazoEndValue }
        : undefined,
      hora,
      myMentions: showMentions ? myMentions : false,
      searchTerm: searchTerm && searchTerm.length > 0 ? searchTerm : undefined,
    });

    if (showMentions && myMentions) params.set('minhas_mencoes','1'); else params.delete('minhas_mencoes');
    if (searchTerm && searchTerm.length > 0) {
      params.set("busca", searchTerm);
    } else {
      params.delete("busca");
    }

    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "";
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl);
    }
  }, [filters, myMentions, router, pathname, searchParamsStr, onFiltersChange, showMentions]);

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <Filters filters={filters} setFilters={setFilters} />
      {showMentions && myMentions && (
        <div
          className="inline-flex h-9 items-center gap-2 rounded-none px-3 text-white shadow-sm text-xs"
          style={{ backgroundColor: "var(--color-primary)", border: "1px solid var(--color-primary)" }}
        >
          <div className="inline-flex items-center gap-1">
            <AtSign className="size-4" />
            <span className="font-semibold">Minhas menções</span>
          </div>
          <button
            type="button"
            onClick={() => setMyMentions(false)}
            className="inline-flex h-5 w-5 items-center justify-center rounded-none text-white transition"
            style={{ backgroundColor: "var(--color-primary)", border: "1px solid transparent" }}
            aria-label="Remover filtro Minhas menções"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setCalendarOpen(false);
            setSelectedView(null);
            setCommandInput("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
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
            {selectedView === FilterType.BUSCAR ? (
              <div className="p-3 flex flex-col gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="group flex gap-3 items-center justify-start px-2 py-2 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1 command-item"
                  onClick={() => {
                    setSelectedView(null);
                    setCommandInput("");
                    commandInputRef.current?.focus();
                  }}
                >
                  <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium">Voltar</span>
                </Button>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Buscar por nome do card
                  </label>
                  <Input
                    placeholder="Ex.: Maria Silva"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleApplySearch();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setSelectedView(null);
                      }
                    }}
                    ref={searchInputRef}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {(searchDraft.trim().length > 0 || searchFilter?.value?.[0]) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                    >
                      Limpar
                    </Button>
                  )}
                  <Button type="button" size="sm" onClick={handleApplySearch}>
                    Aplicar
                  </Button>
                </div>
              </div>
            ) : (
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
                    <>
                      <CommandItem
                        className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1 command-item"
                        value="voltar"
                        onSelect={() => {
                          setSelectedView(null);
                          setCommandInput("");
                          commandInputRef.current?.focus();
                        }}
                      >
                        <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium">Voltar</span>
                      </CommandItem>
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
                    </>
                  ) : (
                    <>
                      <CommandGroup className="p-0">
                        {filterViewOptions
                          .flat()
                          .filter((filter: FilterOption) => filter.name !== FilterType.PRAZO)
                          .filter((filter: FilterOption) => (allowedTypesResolved as unknown as string[]).includes(filter.name))
                          .map((filter: FilterOption) => (
                            <CommandItem
                              className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1 command-item"
                              key={filter.name}
                              value={filter.name}
                              onSelect={(currentValue) => {
                                setSelectedView(currentValue as FilterType);
                                setCommandInput("");
                                if (currentValue !== FilterType.BUSCAR) {
                                  commandInputRef.current?.focus();
                                } else {
                                  requestAnimationFrame(() => {
                                    searchInputRef.current?.focus();
                                  });
                                }
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
                      {showMentions && (
                      <CommandItem
                        value="minhas-mencoes"
                        className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duração-150 cursor-pointer rounded-sm mx-1 command-item"
                        onSelect={() => setMyMentions((v) => !v)}
                      >
                        <AtSign className={cn("size-4 shrink-0", myMentions ? "text-emerald-600" : "text-muted-foreground")} />
                        <span className="text-sm font-medium">
                          Minhas menções
                        </span>
                      </CommandItem>
                      )}
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
            )}
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
