import React, { useLayoutEffect } from "react";
import PropTypes from "prop-types";

import { Link } from "react-router-dom";
import { connect } from "react-redux";

import NavBar from "./NavBar";

const Users = ({ users }) => {
  useLayoutEffect(() => {
    const rootStyle = document.documentElement.style;

    rootStyle.setProperty("--body-bg-color", "var(--light-color)");
  }, []);

  return (
    <div className="o-wrapper js-wrapper">
      <div className="o-container js-container">
        <NavBar />
        <div className="c-users">
          <h2 className="c-users__heading">Users</h2>
          <div className="c-users__data">
            <table className="c-table">
              <tbody>
                <tr className="c-table__heading-row">
                  <th className="c-table__heading">Name</th>
                  <th className="c-table__heading">Username</th>
                  <th className="c-table__heading">Blogs</th>
                </tr>
                {users.map((user) => (
                  <tr className="c-table__data-row" key={user.id}>
                    <td className="c-table__data">{user.username}</td>
                    <td className="c-table__data">
                      <Link
                        to="#"
                        className="u-stretched-link c-table__data-link"
                      >
                        {user.name}
                      </Link>
                    </td>
                    <td className="c-table__data hasIcon">
                      {user.blogsCreated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state, ownProps) => {
  const users = state.users.map((user) => {
    const blogsCreated = user.blogs.length;

    return {
      username: user.username,
      name: user.name,
      id: user.id,
      blogsCreated,
    };
  });

  return { users };
};

Users.propTypes = {
  users: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default connect(mapStateToProps)(Users);
