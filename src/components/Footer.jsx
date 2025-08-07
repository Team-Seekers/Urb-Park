import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const links = [
    { name: "About Us", path: "/about" },
    
    { name: "FAQ", path: "/faq" },
    { name: "Contact", path: "/contact" },
    { name: "Terms of Service", path: "/terms" },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300 mt-12 py-8">
      <div className="container mx-auto px-4 text-center">
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {links.map((link, i) => (
            <Link
              key={i}
              to={link.path}
              aria-label={`Navigate to ${link.name}`}
              className="transition duration-300 px-4 py-2 rounded hover:shadow-md hover:text-yellow-500"
            >
              {link.name}
            </Link>
          ))}
        </div>
        <p>&copy; {new Date().getFullYear()} UrbPark. All Rights Reserved.</p>
        <p className="text-sm text-gray-400 mt-1">
          An eco-friendly solution for modern cities.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
