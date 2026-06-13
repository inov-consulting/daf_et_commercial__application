import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { TypedUseSelectorHook, useSelector, useDispatch } from "react-redux";
import usersReducer from "./features/users/usersSlice";
import meReducer from "./features/me/meSlice";
import companiesReducer from "./features/companies/companiesSlice";
import groupsReducer from "./features/groups/groupsSlice";
import prospectsReducer from "./features/prospects/prospectsSlice";

const persistConfig = {
  key: "root",
  storage,
  version: 1,
  whitelist: ["users"],
};

const rootReducer = {
  users: usersReducer,
  me: meReducer,
  companies: companiesReducer,
  groups: groupsReducer,
  prospects: prospectsReducer,
};

const persistedReducer = persistReducer(persistConfig, combineReducers(rootReducer));

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppDispatch = () => useDispatch<AppDispatch>();
