import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import tenantsReducer from "../features/tenants/tenantsSlice";
import bookingReducer from "../features/booking/bookingSlice";
import queueReducer from "../features/queue/queueSlice";
import appointmentsReducer from "../features/appointments/appointmentsSlice";
import servicesReducer from "../features/services/servicesSlice";
import barbersReducer from "../features/barbers/barbersSlice";
import workingHoursReducer from "../features/workingHours/workingHoursSlice";
import platformTenantsReducer from "../features/platformTenants/platformTenantsSlice";
import platformCustomersReducer from "../features/platformCustomers/platformCustomersSlice";
import companyReducer from "../features/company/companySlice";
import customerProfileReducer from "../features/auth/customerProfileSlice";
import customersReducer from "../features/customers/customersSlice";
import reportsReducer from "../features/reports/reportsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenants: tenantsReducer,
    booking: bookingReducer,
    queue: queueReducer,
    appointments: appointmentsReducer,
    services: servicesReducer,
    barbers: barbersReducer,
    workingHours: workingHoursReducer,
    platformTenants: platformTenantsReducer,
    platformCustomers: platformCustomersReducer,
    company: companyReducer,
    customerProfile: customerProfileReducer,
    customers: customersReducer,
    reports: reportsReducer
  }
});
