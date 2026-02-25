import { configureStore } from "@reduxjs/toolkit";
import { patientApi } from "../../features/patients/store/patientApi";
import { appointmentApi } from "../../features/appointments/store/appointmentApi";

export const store = configureStore({
  reducer: {
    [patientApi.reducerPath]: patientApi.reducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(patientApi.middleware)
      .concat(appointmentApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
