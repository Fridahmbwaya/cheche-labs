"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LucideIcon, Sparkles, User, Users } from "lucide-react";
import { ChecheLogo } from "@/components/brand/ChecheLogo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const DEMO_PASSWORD = "Demo1234!";

type Persona = "employee" | "hr";

const personas = {
  employee: {
    email: "grace@jua-mfb.co.ke",
    name: "Grace Achieng Odhiambo",
    role: "Compliance Officer",
    redirect: "/learn",
    icon: User,
  },
  hr: {
    email: "amina@jua-mfb.co.ke",
    name: "Amina Wanjiku Hassan",
    role: "HR / Compliance Manager",
    redirect: "/hr",
    icon: Users,
  },
} as const;

function PersonaCard({
  name,
  role,
  icon: Icon,
  loading,
  disabled,
  onSelect,
}: {
  name: string;
  role: string;
  icon: LucideIcon;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all",
        "hover:border-primary/40 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        disabled && "pointer-events-none opacity-70"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender text-primary">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
        ) : (
          <Icon className="h-5 w-5" aria-hidden />
        )}
      </div>
      <div>
        <div className="text-sm font-bold text-ink">{name}</div>
        <p className="text-xs text-mutedFg">{role}</p>
      </div>
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loadingPersona, setLoadingPersona] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function handleSignIn(persona: Persona) {
    const { email, redirect } = personas[persona];
    setLoadingPersona(persona);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });

    if (signInError) {
      setError(signInError.message);
      setLoadingPersona(null);
      return;
    }

    router.refresh();
    router.push(redirect);
  }

  const isSigningIn = loadingPersona !== null;

  return (
    <div className="card p-8">
      <div className="mb-6 text-center">
        <div className="mb-5 flex justify-center">
          <ChecheLogo variant="image" size="md" className="mx-auto" />
        </div>
        <p className="section-label mb-3">Compliance training · Kenya</p>
        <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-mutedFg">
          Sign in to continue your compliance training
        </p>
      </div>

      <div className="space-y-3">
        <PersonaCard
          name={personas.employee.name}
          role={personas.employee.role}
          icon={personas.employee.icon}
          loading={loadingPersona === "employee"}
          disabled={isSigningIn}
          onSelect={() => handleSignIn("employee")}
        />
        <PersonaCard
          name={personas.hr.name}
          role={personas.hr.role}
          icon={personas.hr.icon}
          loading={loadingPersona === "hr"}
          disabled={isSigningIn}
          onSelect={() => handleSignIn("hr")}
        />
        <PersonaCard
          name="Module Creator"
          role="Content Designer"
          icon={Sparkles}
          loading={false}
          disabled={isSigningIn}
          onSelect={() => {}}
        />
      </div>

      {error && (
        <p className="mt-4 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 rounded-lg bg-lavender p-3 text-xs text-primary">
        <span className="font-bold">Demo org:</span>{" "}
        <span className="text-mutedFg">
          Jua Microfinance Bank · Central Bank of Kenya (CBK)
        </span>
      </div>
    </div>
  );
}
