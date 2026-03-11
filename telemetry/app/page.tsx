import TelemetryBlackout from '@/components/blackout';
import RealTimeDashboard from '@/components/dashboard'; // Denna byggs i valvet
export const dynamic = 'force-dynamic';
export default function Page() {
    const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

    if (isMaintenance) {
        return <TelemetryBlackout />;
    }

    return <RealTimeDashboard />;
}
