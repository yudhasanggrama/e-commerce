"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function AuthButtons() {
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState<string | null>(null);

    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const supabase = createSupabaseBrowser();

        supabase.auth.getSession().then(({ data }) => {
        setEmail(data.session?.user?.email ?? null);
        setLoading(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setEmail(session?.user?.email ?? null);
        });

        return () => sub.subscription.unsubscribe();
    }, []);

    if (loading) return null;
    if (pathname === "/login") return null;

    if (!email) {
        return (
        <Button asChild variant={"outline"} className="hover:bg-primary/10">
            <Link href="/login"><LogIn />Login</Link>
        </Button>
        );
    }

    return (
        <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{email}</span>
        <Button
            variant="outline"
            onClick={async () => {
            const supabase = createSupabaseBrowser();
            await supabase.auth.signOut();
            router.push("/");
            router.refresh();
            }}
        >
            Logout
        </Button>
        </div>
    );
}
