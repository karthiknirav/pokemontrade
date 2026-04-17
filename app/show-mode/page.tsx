import { AppShell } from "@/components/app-shell";
import { OcrUploadForm } from "@/components/ocr-upload-form";
import { ShowModeForm } from "@/components/show-mode-form";
import { requireSession } from "@/lib/auth/guard";

export default async function ShowModePage() {
  await requireSession();

  return (
    <AppShell
      title="Show Mode"
      subtitle="Scan a price tag or enter cards manually. Get your negotiation target in seconds."
    >
      {/* Mobile: scan on top, form below. Desktop: side by side */}
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[1.2fr_0.8fr]">
        <ShowModeForm />
        <OcrUploadForm />
      </div>
    </AppShell>
  );
}
