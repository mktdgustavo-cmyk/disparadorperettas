import { useEffect, useState } from 'react'
import { useToast, Toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export function Toaster() {
  const { subscribe } = useToast()
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return subscribe(setToasts)
  }, [subscribe])

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "rounded-lg border p-4 shadow-lg bg-white",
            "animate-in slide-in-from-top-5",
            toast.variant === 'destructive' && 'border-red-500 bg-red-50'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className={cn(
                "font-semibold text-sm",
                toast.variant === 'destructive' ? 'text-red-900' : 'text-gray-900'
              )}>
                {toast.title}
              </h3>
              {toast.description && (
                <p className={cn(
                  "text-sm mt-1",
                  toast.variant === 'destructive' ? 'text-red-700' : 'text-gray-600'
                )}>
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                const newToasts = toasts.filter(t => t.id !== toast.id)
                setToasts(newToasts)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
