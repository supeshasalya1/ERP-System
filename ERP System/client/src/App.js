import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./Pages/Home/Home";
import Inventory from "./Pages/Inventory/Inventory";
//import Suppliers from "./Components/Suppliers/Suppliers";
//import Products from "./Components/Products/Products";
import GRNCreate from "./Components/GRN/GRNCreate";
import GRNList from "./Components/GRN/GRNList";
import AddSupplier from "./Components/Suppliers/AddSupplier";
import SupplierList from "./Components/Suppliers/SupplierList";
import AddProducts from "./Components/Products/ProductAdd";
import ProductsList from "./Components/Products/ProductList";
import Login from "./Pages/Login/Login";
import Signup from "./Pages/Signup/Signup";

import CurrentStock from "./Pages/Stock/CurrentStock";
//import GrnEditList from "./Pages/GrnEditList";
//import GrnEditDetail from "./Pages/GrnEditDetail";
import ProDashboard from "./Pages/Dashboard/ProDashboard";
import IssueCreate from "./Components/ISSUE/INCreate";
import IssueList from "./Components/ISSUE/INList";
//import IssueNoteEdit from "./Components/ISSUE/INEdit";
import GRNEdit from "./Components/GRN/GRNEdit";
import BinCard from "./Components/BinCard/BinCard";

import ExpiredStockView from "./Components/EXPIRED/ExpiredStockView";
import ExpiredNoteCreate from "./Components/EXPIRED/ExpiredNoteCreate";
import ExpiredReport from "./Components/EXPIRED/ExpiredReport";
import UnloadCreate from "./Components/Unload/UnloadCreate";
import AdjustmentCreate from "./Components/Adjustments/AdjustmentCreate";
import AdjustmentList from "./Components/Adjustments/AdjustmentList";
import UnloadList from "./Components/Unload/UnloadList";
import StockView from "./Components/StockView/StockView";

import { RequireAdmin, RequireUser } from "./Components/Auth/RequireRole";

import AdminIssueNotes from "./Pages/Admin/AdminIssueNotes";
import AdminGrns from "./Pages/Admin/AdminGRNS";
import AdminStock from "./Pages/Admin/AdminStock";
import AdminDashboard from "./Pages/Admin/AdminDashboard";
import AdminBinCard from "./Pages/Admin/AdminBinCard";
import AdminUnloadNotes from "./Pages/Admin/AdminUnloadNotes";
import AdminExpiredStore from "./Pages/Admin/AdminExpiredStore";
import AdminExpiredReport from "./Pages/Admin/AdminExpiredReport";
import AdminCashCollectors from "./Pages/Admin/AdminCashCollectors";
import AdminAdjustments from "./Pages/Admin/AdminAdjustmentNotes";
import IssueLorryAdd from "./Components/IssueLorries";

import ExpireReturnCreate from "./Components/EXPIRED/ExpireReturnCreate";
import ChangePassword from "./Pages/Account/ChangePassword";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* User-only routes */}
      <Route
        path="/inventory"
        element={
          <RequireUser>
            <Inventory />
          </RequireUser>
        }
      />

      <Route
        path="/suppliers/add"
        element={
          <RequireUser>
            <AddSupplier />
          </RequireUser>
        }
      />

      <Route
        path="/suppliers/list"
        element={
          <RequireUser>
            <SupplierList />
          </RequireUser>
        }
      />

      <Route
        path="/products/add"
        element={
          <RequireUser>
            <AddProducts />
          </RequireUser>
        }
      />

      <Route
        path="/bincard"
        element={
          <RequireUser>
            <BinCard />
          </RequireUser>
        }
      />

      <Route
        path="/unload/create"
        element={
          <RequireUser>
            <UnloadCreate />
          </RequireUser>
        }
      />

      <Route
        path="/unload/list"
        element={
          <RequireUser>
            <UnloadList />
          </RequireUser>
        }
      />

      <Route
        path="/issue-lorries/add"
        element={
          <RequireUser>
            <IssueLorryAdd />
          </RequireUser>
        }
      />

      <Route
        path="/stock/current"
        element={
          <RequireUser>
            <CurrentStock />
          </RequireUser>
        }
      />

      <Route
        path="/products/list"
        element={
          <RequireUser>
            <ProductsList />
          </RequireUser>
        }
      />

      <Route
        path="/grn/add"
        element={
          <RequireUser>
            <GRNCreate />
          </RequireUser>
        }
      />

      <Route
        path="/grn/list"
        element={
          <RequireUser>
            <GRNList />
          </RequireUser>
        }
      />

      <Route
        path="/user/dashboard"
        element={
          <RequireUser>
            <ProDashboard />
          </RequireUser>
        }
      />

      <Route
        path="/in/add"
        element={
          <RequireUser>
            <IssueCreate />
          </RequireUser>
        }
      />

      <Route
        path="/issue/list"
        element={
          <RequireUser>
            <IssueList />
          </RequireUser>
        }
      />

      <Route
        path="/grn/edit/:id"
        element={
          <RequireUser>
            <GRNEdit />
          </RequireUser>
        }
      />

      <Route
        path="/stock/view"
        element={
          <RequireUser>
            <StockView />
          </RequireUser>
        }
      />

      <Route
        path="/expired/store"
        element={
          <RequireUser>
            <ExpiredStockView />
          </RequireUser>
        }
      />

      <Route
        path="/expired/add"
        element={
          <RequireUser>
            <ExpiredNoteCreate />
          </RequireUser>
        }
      />

      <Route
        path="/expired/report"
        element={
          <RequireUser>
            <ExpiredReport />
          </RequireUser>
        }
      />

      <Route
        path="/adjustments/new"
        element={
          <RequireUser>
            <AdjustmentCreate />
          </RequireUser>
        }
      />

      <Route
        path="/adjustments"
        element={
          <RequireUser>
            <AdjustmentList />
          </RequireUser>
        }
      />

      <Route
        path="/expired/return"
        element={
          <RequireUser>
            <ExpireReturnCreate />
          </RequireUser>
        }
      />

      <Route
        path="/account/password"
        element={
          <RequireUser>
            <ChangePassword variant="user" />
          </RequireUser>
        }
      />

      {/* Admin-only routes */}
      <Route
        path="/admin/dashboard"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />

      <Route
        path="/admin/stock"
        element={
          <RequireAdmin>
            <AdminStock />
          </RequireAdmin>
        }
      />



      <Route
        path="/admin/grns"
        element={
          <RequireAdmin>
            <AdminGrns />
          </RequireAdmin>
        }
      />

      <Route
        path="/admin/issue-notes"
        element={
          <RequireAdmin>
            <AdminIssueNotes />
          </RequireAdmin>
        }
      />

            <Route
        path="/admin/bincard"
        element={
          <RequireAdmin>
            <AdminBinCard />
          </RequireAdmin>
        }
      />

            <Route
        path="/admin/unload-notes"
        element={
          <RequireAdmin>
            <AdminUnloadNotes />
          </RequireAdmin>
        }
      />

          <Route
        path="/admin/signup"
        element={
          <RequireAdmin>
            <Signup />
          </RequireAdmin>
        }
      />

          <Route
        path="/admin/expire-store"
        element={
          <RequireAdmin>
            <AdminExpiredStore />
          </RequireAdmin>
        }
      />

          <Route
        path="/admin/expired/report"
        element={
          <RequireAdmin>
            <AdminExpiredReport />
          </RequireAdmin>
        }
      />

          <Route
        path="/admin/cash-collectors"
        element={
          <RequireAdmin>
            <AdminCashCollectors />
          </RequireAdmin>
        }
      />

          <Route
        path="/admin/adjustments"
        element={
          <RequireAdmin>
            <AdminAdjustments />
          </RequireAdmin>
        }
      />

      <Route
        path="/admin/account/password"
        element={
          <RequireAdmin>
            <ChangePassword variant="admin" />
          </RequireAdmin>
        }
      />

      {/* We can add more admin routes here later:
          /admin/unload-notes, /admin/adjustments, /admin/expire-store, etc. */}
    </Routes>
  );
}

export default App;
