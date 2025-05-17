import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}: DeleteConfirmationModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-danger-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-danger-600" />
                </div>

                <Dialog.Title
                  as="h3"
                  className="mt-4 text-lg font-medium leading-6 text-gray-900 text-center"
                >
                  {title}
                </Dialog.Title>

                <div className="mt-3">
                  <p className="text-sm text-gray-500 text-center">
                    {message}
                  </p>
                </div>

                <div className="mt-6 flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                  >
                    Sí, eliminar
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}