import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function VerificationTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hesap Doğrulama Talepleri</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Hesap doğrulama özelliği henüz aktif değil. Kullanıcılar hesap doğrulama talebinde bulunabilmek için önce gerekli veritabanı tablolarının oluşturulması gerekmektedir.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
