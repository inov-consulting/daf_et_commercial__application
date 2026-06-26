'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ValidationQueue } from '@/components/layout/validation-queue';
import { AgentsStatus } from '@/components/layout/agents-status';
import { Toast } from '@/components/ui/toast';
import {
    CheckCircleIcon,
    WarningCircleIcon,
    InfoIcon,
    XCircleIcon
} from '@phosphor-icons/react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
    message: string;
    type: ToastType;
    title: string;
    icon: React.ReactNode;
    id: number;
}

// Configuration des toasts selon le type
const toastConfig: Record<ToastType, { title: string; icon: React.ReactNode }> = {
    success: {
        title: 'Succès',
        icon: <CheckCircleIcon size={18} weight="fill" />
    },
    error: {
        title: 'Erreur',
        icon: <XCircleIcon size={18} weight="fill" />
    },
    warning: {
        title: 'Attention',
        icon: <WarningCircleIcon size={18} weight="fill" />
    },
    info: {
        title: 'Information',
        icon: <InfoIcon size={18} weight="fill" />
    },
};

function CentreIAPage() {
    const [pendingCount, setPendingCount] = useState(7);
    const [toasts, setToasts] = useState<ToastState[]>([]);
    const toastIdRef = useRef(0);
    const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

    // Nettoyage des timers au démontage
    useEffect(() => {
        // Capture de la valeur actuelle de la ref
        const currentTimers = timersRef.current;
        
        return () => {
            // Utilisation de la valeur capturée dans le cleanup
            currentTimers.forEach(timer => clearTimeout(timer));
            currentTimers.clear();
        };
    }, []);

    // Fonction pour afficher un toast
    const showToast = useCallback((
        message: string,
        type: ToastType = 'success',
        duration = 4000
    ) => {
        const id = toastIdRef.current++;
        const newToast: ToastState = {
            id,
            message,
            type,
            title: toastConfig[type].title,
            icon: toastConfig[type].icon,
        };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss après la durée spécifiée
        if (duration > 0) {
            const timer = setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
                timersRef.current.delete(id);
            }, duration);

            timersRef.current.set(id, timer);
        }
    }, []);

    // Fonction pour fermer manuellement un toast
    const dismissToast = useCallback((id: number) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const handleValidate = (id: string, title: string) => {
        setPendingCount(prev => Math.max(0, prev - 1));
        showToast(
            `${title.slice(0, 36)}${title.length > 36 ? '…' : ''} · Validé ✓`,
            'success'
        );
    };

    const handleReject = () => {
        setPendingCount(prev => Math.max(0, prev - 1));
        showToast('Item rejeté · Déplacé dans Rejetés', 'warning');
    };

    const handleEdit = (id: string) => {
        showToast(`Mode édition · ${id}`, 'info');
    };

    return (
        <div className="min-h-screen overflow-hidden">
            <div className="p-4 sm:p-5 md:p-7 pb-14 max-w-full">
                <PageHeader pendingCount={pendingCount} />

                <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
                    {/* Colonne principale */}
                    <div className="w-full lg:flex-1 lg:max-w-[716px] min-w-0">
                        <ValidationQueue
                            pendingCount={pendingCount}
                            onValidate={handleValidate}
                            onReject={handleReject}
                            onEdit={handleEdit}
                            showToast={showToast}
                        />
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-[340px] xl:w-[384px] flex-shrink-0">
                        <AgentsStatus showToast={showToast} />
                    </div>
                </div>
            </div>

            {/* Toasts empilés en bas à droite */}
            <div className="fixed bottom-6 right-4 sm:right-6 md:right-8 z-[200] flex flex-col-reverse gap-2 w-[calc(100vw-2rem)] sm:w-80 max-w-xs pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className="animate-in slide-in-from-bottom-2 fade-in duration-300 pointer-events-auto"
                    >
                        <Toast
                            type={toast.type}
                            title={toast.title}
                            message={toast.message}
                            icon={toast.icon}
                            onDismiss={() => dismissToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CentreIAPage;