import { Outlet, useLocation } from 'react-router-dom'

export function DashboardLayout() {
  const { pathname } = useLocation()
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:pb-12">
      <div key={pathname} className="page-in">
        <Outlet />
      </div>
    </div>
  )
}
