import type { NavItem } from "@/components/layout/Sidebar"
import { assets } from "@/lib/assets"

/** Primary navigation — labels and order preserved from the original. */
export const navItems: NavItem[] = [
  { id: "home", label: "בית", icon: assets.iconHome },
  { id: "started", label: "משפטים שהתחלתי", icon: assets.iconPencil },
  { id: "completed", label: "משפטים שהשלמתי", icon: assets.iconChat },
]
