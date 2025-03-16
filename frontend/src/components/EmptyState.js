import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';

const EmptyState = ({ title, description, icon, actionLink, actionText }) => {
  return (
    <div className="text-center py-12 px-6 bg-white dark:bg-dark-700 rounded-lg shadow border border-gray-100 dark:border-dark-600">
      <div className="mx-auto h-24 w-24 rounded-full bg-primary-50 dark:bg-dark-600 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-6 text-xl font-medium text-dark-600 dark:text-white">{title}</h3>
      <p className="mt-2 text-gray-500 dark:text-gray-400">{description}</p>
      {actionLink && actionText && (
        <div className="mt-6">
          <Link
            to={actionLink}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            {actionText}
          </Link>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
