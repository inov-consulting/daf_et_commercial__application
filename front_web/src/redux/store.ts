import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { TypedUseSelectorHook, useSelector, useDispatch } from "react-redux";
import usersReducer from "./features/users/usersSlice";
import meReducer from "./features/me/meSlice";
import companiesReducer from "./features/companies/companiesSlice";
import groupsReducer from "./features/groups/groupsSlice";
import prospectsReducer from "./features/prospects/prospectsSlice";
import notesReducer from "./features/notes/notesSlice";
import apiLogsReducer from "./features/api-logs/apiLogsSlice";
import compteRendusReducer from "./features/compte-rendus/compteRendusSlice";
import offersReducer from "./features/offers/offersSlice";
import appConfigReducer from "./features/app-config/appConfigSlice";
import kpiReducer from "./features/kpi/kpiSlice";
import aiReducer from "./features/ai/aiSlice";
import customersReducer from "./features/customers/customersSlice";
import dafReducer from "./features/daf/dafSlice";
import notificationsReducer from "./features/notifications/notificationsSlice";
import whatsappReducer from "./features/whatsapp/whatsappSlice";

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
  notes: notesReducer,
  apiLogs: apiLogsReducer,
  compteRendus: compteRendusReducer,
  offers: offersReducer,
  appConfig: appConfigReducer,
  kpi: kpiReducer,
  ai: aiReducer,
  customers: customersReducer,
  daf:           dafReducer,
  notifications: notificationsReducer,
  whatsapp:      whatsappReducer,
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
