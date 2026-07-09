import { createContext, useState, useEffect, useContext } from "react";
import { useAuth } from "./AuthContext";
import {
  getUserCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart as clearCartAPI,
} from "../services/api";
import { toast } from "react-hot-toast";

const CartContext = createContext<any>(null as any);

export const useCart = () => {
  return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Load cart based on authentication status
  useEffect(() => {
    const loadCart = async () => {
      if (isAuthenticated) {
        // User is logged in, fetch cart from backend
        try {
          setLoading(true);
          const data = await getUserCart();
          setCartItems(data);
        } catch (error) {
          console.error("Error fetching cart:", error);
          toast.error("Failed to load your cart");
        } finally {
          setLoading(false);
        }
      } else {
        // User is not logged in, load from localStorage
        const storedCart = localStorage.getItem("cart");
        if (storedCart) {
          const parsedCart = JSON.parse(storedCart);
          setCartItems(parsedCart);
        }
      }
    };

    loadCart();
  }, [isAuthenticated, user]);

  // Update localStorage and totals whenever cart changes
  useEffect(() => {
    // Only save to localStorage if user is not authenticated
    if (!isAuthenticated) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }

    // Calculate totals
    const itemCount = cartItems.reduce(
      (total, item) => total + item.quantity,
      0,
    );
    const price = cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    setTotalItems(itemCount);
    setTotalPrice(price);
  }, [cartItems, isAuthenticated]);

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    try {
      if (isAuthenticated) {
        // If user is logged in, sync with backend
        const existingItem = cartItems.find(
          (item) => item.product === product._id,
        );
        const newQuantity = existingItem
          ? existingItem.quantity + quantity
          : quantity;

        await addItemToCart(product._id, newQuantity);
        const updatedCart = await getUserCart();
        setCartItems(updatedCart);
      } else {
        // If user is not logged in, use local state
        setCartItems((prevItems) => {
          // Check if item already exists in cart
          const existingItemIndex = prevItems.findIndex(
            (item) => item._id === product._id,
          );

          if (existingItemIndex >= 0) {
            // Item exists, update quantity
            const updatedItems = [...prevItems];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + quantity,
            };
            return updatedItems;
          } else {
            // Item doesn't exist, add new item
            return [...prevItems, { ...product, quantity }];
          }
        });
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add item to cart");
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    try {
      if (isAuthenticated) {
        // If user is logged in, sync with backend
        await removeCartItem(productId);
        const updatedCart = await getUserCart();
        setCartItems(updatedCart);
      } else {
        // If user is not logged in, use local state
        setCartItems((prevItems) =>
          prevItems.filter(
            (item) =>
              // Check both _id and product fields to ensure we catch all cases
              item._id !== productId &&
              (item.product ? item.product.toString() !== productId : true),
          ),
        );
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item from cart");
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, quantity) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      if (isAuthenticated) {
        // If user is logged in, sync with backend
        await updateCartItem(productId, quantity);
        const updatedCart = await getUserCart();
        setCartItems(updatedCart);
      } else {
        // If user is not logged in, use local state
        setCartItems((prevItems) =>
          prevItems.map((item) => {
            // Check both _id and product fields to ensure we catch all cases
            if (
              item._id === productId ||
              (item.product && item.product.toString() === productId)
            ) {
              return { ...item, quantity };
            }
            return item;
          }),
        );
      }
    } catch (error) {
      console.error("Error updating cart:", error);
      toast.error("Failed to update cart");
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      if (isAuthenticated) {
        // If user is logged in, sync with backend
        await clearCartAPI();
        setCartItems([]);
      } else {
        // If user is not logged in, use local state
        setCartItems([]);
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart");
    }
  };

  const value = {
    cartItems,
    totalPrice,
    totalItems,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;

