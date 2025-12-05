import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";

export default function VerifyAccount() {
  const navigate = useNavigate();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session!.user.id)
        .maybeSingle();
      return data;
    },
  });

  if (profile?.is_verified) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto border-glass-border bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-success-green" />
                Hesabınız Doğrulandı
              </CardTitle>
              <CardDescription>
                Hesabınız başarıyla doğrulanmış durumda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/profile")} className="w-full">
                Profile Dön
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border-glass-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-brand-blue" />
              Hesap Doğrulama
            </CardTitle>
            <CardDescription>
              Hesabınızı doğrulamak için destek ekibimizle iletişime geçin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-brand-blue/10 border border-brand-blue/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-brand-blue mt-0.5" />
                <div>
                  <p className="font-medium text-brand-blue">Doğrulama için gerekli belgeler:</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>Kimlik kartı fotoğrafı (ön ve arka yüz)</li>
                    <li>Selfie (kimlik ile birlikte)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Doğrulama sonrasında profilinizde özel rozet görünecektir ve güvenilirliğiniz artacaktır.
            </p>
            
            <div className="flex gap-3">
              <Button onClick={() => navigate("/support")} className="flex-1 bg-brand-blue hover:bg-brand-blue/90">
                Destek Talebi Oluştur
              </Button>
              <Button onClick={() => navigate("/profile")} variant="outline" className="flex-1">
                Profile Dön
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}