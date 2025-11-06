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
import { ListFilter } from "lucide-react";
import { nanoid } from "nanoid";
import * as React from "react";
import { AnimateChangeInHeight } from "@/components/ui/filters";
import Filters from "@/components/ui/filters";
import {
  Filter,
  FilterOperator,
  FilterOption,
  FilterType,
  Responsavel,
  filterViewOptions,
  filterViewToFilterOptions,
} from "@/components/ui/filters";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Mapeamentos entre labels de Prazo e valores usados na URL
const PrazoUrlMap: Record<string, string> = {
  "Agendada para hoje": "hoje",
  "Agendada para amanhã": "amanha",
  "Atrasado": "atrasado",
  "Escolher data": "data",
};

const UrlPrazoToLabel: Record<string, string> = {
  hoje: "Agendada para hoje",
  amanha: "Agendada para amanhã",
  atrasado: "Atrasado",
  data: "Escolher data",
};

export function FilterCTA() {
  const [open, setOpen] = React.useState(false);
  const [selectedView, setSelectedView] = React.useState<FilterType | null>(
    null
  );
  const [commandInput, setCommandInput] = React.useState("");
  const commandInputRef = React.useRef<HTMLInputElement>(null);
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [customDate, setCustomDate] = React.useState<string>("");
  const [, setResponsavelOptions] = React.useState<FilterOption[]>(
    filterViewToFilterOptions[FilterType.RESPONSAVEL]
  );

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    let mounted = true;

    async function loadResponsaveis() {
      const areaRole = pathname?.includes("/kanban/analise")
        ? "analista"
        : "vendedor";

      try {
        const cacheKey = `responsavel-options-${areaRole}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as FilterOption[];
          if (mounted) {
            filterViewToFilterOptions[FilterType.RESPONSAVEL] = parsed;
            setResponsavelOptions(parsed);
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("role", areaRole)
          .order("full_name");

        if (error) throw error;

        const options: FilterOption[] = [
          {
            name: Responsavel.TODOS,
            icon: undefined,
          },
          ...(data || []).map((profile) => ({
            name: profile.full_name ?? "—",
            icon: (
              <Avatar className="h-6 w-6 text-xs">
                <AvatarFallback>
                  {profile.full_name?.slice(0, 2).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            ),
            label: profile.role ?? undefined,
          })),
        ];

        if (mounted) {
          filterViewToFilterOptions[FilterType.RESPONSAVEL] = options;
          setResponsavelOptions(options);
          sessionStorage.setItem(cacheKey, JSON.stringify(options));
        }
      } catch (error) {
        console.error("Falha ao carregar responsáveis para filtro:", error);
        if (mounted) {
          const fallback = [
            {
              name: Responsavel.TODOS,
              icon: undefined,
            },
          ];
          filterViewToFilterOptions[FilterType.RESPONSAVEL] = fallback;
          setResponsavelOptions(fallback);
        }
      }
    }

    loadResponsaveis();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  // Inicializa a UI a partir da URL (?hora, ?prazo, ?data)
  React.useEffect(() => {
    const initial: Filter[] = [];
    const hora = searchParams.get("hora");
    const prazo = searchParams.get("prazo");
    const data = searchParams.get("data") || "";

    if (hora) {
      initial.push({
        id: "hora",
        type: FilterType.HORARIO,
        operator: FilterOperator.IS,
        value: [hora.length === 5 ? hora : hora.slice(0, 5)],
      });
    }

    if (prazo && UrlPrazoToLabel[prazo]) {
      initial.push({
        id: "prazo",
        type: FilterType.PRAZO,
        operator: FilterOperator.IS,
        value: [UrlPrazoToLabel[prazo]],
      });
    }
    setCustomDate(data);
    setFilters(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchParamsStr = React.useMemo(() => searchParams?.toString() ?? "", [searchParams]);

  // Aplica efeitos dos filtros na URL (igual ao FilterBar antigo)
  React.useEffect(() => {
    const params = new URLSearchParams(searchParamsStr);

    // Hora (pega o primeiro valor caso o usuário selecione mais de um)
    const horaFilter = filters.find((f) => f.type === FilterType.HORARIO);
    const hora = horaFilter?.value?.[0];
    if (hora) {
      params.set("hora", hora);
    } else {
      params.delete("hora");
    }

    // Prazo/Data
    const prazoFilter = filters.find((f) => f.type === FilterType.PRAZO);
    const prazoLabel = prazoFilter?.value?.[0];
    const prazoUrl = prazoLabel ? PrazoUrlMap[prazoLabel] : undefined;
    if (prazoUrl) {
      params.set("prazo", prazoUrl);
      if (prazoUrl === "data") {
        if (customDate) params.set("data", customDate);
      } else {
        // Se não é data específica, remove ?data
        params.delete("data");
      }
    } else {
      params.delete("prazo");
      params.delete("data");
    }

    const qs = params.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentUrl = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : '';
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl);
    }
  }, [filters, customDate, router, pathname, searchParamsStr]);

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <Filters filters={filters} setFilters={setFilters} />
      {/* Campo de data quando o filtro de Prazo = "Escolher data" estiver ativo */}
      {filters.some((f) => f.type === FilterType.PRAZO && f.value?.includes("Escolher data")) && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="h-9 rounded-md border px-2 text-sm"
          />
        </div>
      )}
      {filters.filter((filter) => filter.value?.length > 0).length > 0 && (
        <Button
          variant="outline"
          className="transition group h-9 text-sm items-center"
          style={{ paddingLeft: '18px', paddingRight: '18px', borderRadius: '10px' }}
          onClick={() => {
            // Limpa filtros e URL (mantém outros params como ?card)
            setFilters([]);
            const params = new URLSearchParams(searchParams?.toString());
            params.delete("hora");
            params.delete("prazo");
            params.delete("data");
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
          }}
        >
          Limpar
        </Button>
      )}
      <Popover
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
          if (!open) {
            setTimeout(() => {
              setSelectedView(null);
              setCommandInput("");
            }, 200);
          }
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
            style={{ paddingLeft: '18px', paddingRight: '18px', borderRadius: '10px' }}
          >
            <ListFilter className="size-6 shrink-0 transition-all text-muted-foreground filter-icon" />
            {filters.length === 0 && "Filtros"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-white border-0 shadow-lg rounded-lg popover-content">
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
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                {selectedView ? (
                  <CommandGroup className="p-0">
                    {filterViewToFilterOptions[selectedView].map(
                      (filter: FilterOption) => (
                        <CommandItem
                          className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1 command-item"
                          key={filter.name}
                          value={filter.name}
                        onSelect={(currentValue) => {
                          // Área muda a rota; os demais entram como filtro
                          if (selectedView === FilterType.AREA) {
                            const toAnalise = String(currentValue).toLowerCase().includes("análise") || String(currentValue).toLowerCase().includes("analise");
                            router.push(toAnalise ? "/kanban/analise" : "/kanban");
                          } else {
                            setFilters((prev) => [
                              ...prev,
                              {
                                id: nanoid(),
                                type: selectedView,
                                operator: FilterOperator.IS,
                                value: [currentValue],
                              },
                            ]);
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
                      )
                    )}
                  </CommandGroup>
                ) : (
                  <CommandGroup className="p-0">
                    {filterViewOptions.flat().map((filter: FilterOption) => (
                      <CommandItem
                        className="group flex gap-3 items-center px-2 py-2 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-150 cursor-pointer rounded-sm mx-1 command-item"
                        key={filter.name}
                        value={filter.name}
                        onSelect={(currentValue) => {
                          setSelectedView(currentValue as FilterType);
                          setCommandInput("");
                          commandInputRef.current?.focus();
                        }}
                      >
                        {filter.icon}
                        <span className="text-sm font-medium">
                          {filter.name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </AnimateChangeInHeight>
        </PopoverContent>
      </Popover>
    </div>
  );
}
