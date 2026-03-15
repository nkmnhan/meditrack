FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_IDENTITY_URL=https://localhost:5001
ARG VITE_PATIENT_API_URL=https://localhost:5002
ARG VITE_APPOINTMENT_API_URL=https://localhost:5003
ARG VITE_MEDICALRECORDS_API_URL=https://localhost:5004
ARG VITE_CLARA_API_URL=https://localhost:5005

ENV VITE_IDENTITY_URL=$VITE_IDENTITY_URL
ENV VITE_PATIENT_API_URL=$VITE_PATIENT_API_URL
ENV VITE_APPOINTMENT_API_URL=$VITE_APPOINTMENT_API_URL
ENV VITE_MEDICALRECORDS_API_URL=$VITE_MEDICALRECORDS_API_URL
ENV VITE_CLARA_API_URL=$VITE_CLARA_API_URL

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
