import { configureStore } from "@reduxjs/toolkit";
import { patientApi } from "../../features/patients/store/patientApi";
import { appointmentApi } from "../../features/appointments/store/appointmentApi";
import { medicalRecordsApi } from "../../features/medical-records/store/medicalRecordsApi";
import { claraApi } from "../../features/clara/store/claraApi";
import { adminApi } from "../../features/admin/store/adminApi";

export const store = configureStore({
  reducer: {
    [patientApi.reducerPath]: patientApi.reducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
    [medicalRecordsApi.reducerPath]: medicalRecordsApi.reducer,
    [claraApi.reducerPath]: claraApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(patientApi.middleware)
      .concat(appointmentApi.middleware)
      .concat(medicalRecordsApi.middleware)
      .concat(claraApi.middleware)
      .concat(adminApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
