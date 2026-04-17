import { apiOk } from "@/lib/api";
import { getRetailerTrackerData, runRetailerIngestion } from "@/lib/services/retailers";

export async function GET() {
  return apiOk(await getRetailerTrackerData());
}

export async function POST() {
  return apiOk(await runRetailerIngestion());
}
