import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Sparkles,
  CalendarPlus,
  UserPlus,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/shared/components/ui/command";

interface CommandPaletteItem {
  readonly label: string;
  readonly icon: React.ElementType;
  readonly path: string;
  readonly shortcut?: string;
}

const pageItems: CommandPaletteItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Patients", icon: Users, path: "/patients" },
  { label: "Appointments", icon: CalendarDays, path: "/appointments" },
  { label: "Medical Records", icon: FileText, path: "/medical-records" },
  { label: "Clara AI", icon: Sparkles, path: "/clara" },
];

const quickActionItems: CommandPaletteItem[] = [
  { label: "New Appointment", icon: CalendarPlus, path: "/appointments/new", shortcut: "A" },
  { label: "Register Patient", icon: UserPlus, path: "/patients/new", shortcut: "P" },
  { label: "Ask Clara", icon: Sparkles, path: "/clara", shortcut: "C" },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen((previousState) => !previousState);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput placeholder="Search... (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pageItems.map((item) => (
            <CommandItem
              key={item.path}
              value={item.label}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4 text-neutral-500" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {quickActionItems.map((item) => (
            <CommandItem
              key={`action-${item.label}`}
              value={item.label}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4 text-neutral-500" />
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>⌘{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
