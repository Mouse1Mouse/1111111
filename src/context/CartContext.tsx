import React, { createContext, useContext, useState } from 'react';

interface CartItem {
  id: string;
  title: string;
  imageUrl: string;
  chosenSet: string;
  chosenPillow: string;
  quantity: number;
  price?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, chosenSet: string, chosenPillow: string) => void;
  updateQuantity: (id: string, chosenSet: string, chosenPillow: string, quantity: number) => void;
  isCartOpen: boolean;
  toggleCart: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addItem = (newItem: CartItem) => {
    setItems(currentItems => {
      const existingItemIndex = currentItems.findIndex(
        item => item.id === newItem.id && 
               item.chosenSet === newItem.chosenSet && 
               item.chosenPillow === newItem.chosenPillow
      );

      if (existingItemIndex > -1) {
        return currentItems.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }

      return [...currentItems, newItem];
    });
  };

  const removeItem = (id: string, chosenSet: string, chosenPillow: string) => {
    setItems(items => items.filter(
      item => !(item.id === id && 
                item.chosenSet === chosenSet && 
                item.chosenPillow === chosenPillow)
    ));
  };

  const updateQuantity = (id: string, chosenSet: string, chosenPillow: string, quantity: number) => {
    setItems(items => items.map(item => 
      item.id === id && 
      item.chosenSet === chosenSet && 
      item.chosenPillow === chosenPillow
        ? { ...item, quantity }
        : item
    ));
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, isCartOpen, toggleCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}