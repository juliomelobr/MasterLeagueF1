import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar alertas customizados
 * @returns {Object} { showAlert, showConfirm, alertState }
 */
export function useCustomAlert() {
    const [alertState, setAlertState] = useState({
        show: false,
        title: '',
        message: '',
        type: 'alert',
        onConfirm: null,
        onCancel: null,
        confirmText: 'OK',
        cancelText: 'Cancelar'
    });

    const showAlert = useCallback((message, title = 'Aviso') => {
        return new Promise((resolve) => {
            setAlertState({
                show: true,
                title,
                message,
                type: 'alert',
                onConfirm: () => {
                    setAlertState(prev => ({ ...prev, show: false }));
                    resolve(true);
                },
                onCancel: null,
                confirmText: 'OK',
                cancelText: 'Cancelar'
            });
        });
    }, []);

    const showConfirm = useCallback((message, title = 'Confirmar') => {
        return new Promise((resolve) => {
            setAlertState({
                show: true,
                title,
                message,
                type: 'confirm',
                onConfirm: () => {
                    setAlertState(prev => ({ ...prev, show: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setAlertState(prev => ({ ...prev, show: false }));
                    resolve(false);
                },
                confirmText: 'Confirmar',
                cancelText: 'Cancelar'
            });
        });
    }, []);

    return {
        showAlert,
        showConfirm,
        alertState
    };
}










































