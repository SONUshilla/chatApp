import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const hideFooterRoutes = ['/videoRoom', '/chatRoom'];
  const shouldHideFooter = hideFooterRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {!shouldHideFooter && <Navbar />}
      <main className={`flex-grow ${shouldHideFooter ? 'h-[calc(100vh-64px)] overflow-hidden' : 'pt-16'}`}>
        {children}
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

export default Layout;
