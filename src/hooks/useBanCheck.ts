import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useBanCheck = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkBanStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check profile ban status
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_banned) {
        toast({
          title: "Hesap Banlandı",
          description: "Hesabınız banlanmıştır. Lütfen destek ile iletişime geçin.",
          variant: "destructive",
          duration: 10000,
        });

        await supabase.auth.signOut();
        navigate("/auth");
      }
    };

    checkBanStatus();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          checkBanStatus();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);
};
