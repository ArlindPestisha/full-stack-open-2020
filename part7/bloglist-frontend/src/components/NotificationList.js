import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import Notification from "./Notification";

const NotificationList = ({ notificationsToShow, contextClass }) => {
  return (
    <div className={`c-alerts-container ${contextClass}`}>
      {notificationsToShow.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.level}
          message={notification.message}
        />
      ))}
    </div>
  );
};

const notificationsToShow = (notifications) => {
  if (notifications.length <= 3) {
    return notifications;
  } else {
    const notificationsByDateDesc = [...notifications].sort(
      (a, b) => b.date - a.date
    );

    const lastThreeNotifications = notificationsByDateDesc
      .slice(0, 3)
      .reverse();

    return lastThreeNotifications;
  }
};

const mapStateToProps = (state, ownProps) => {
  return {
    notificationsToShow: notificationsToShow(state.notifications),
    contextClass: ownProps.contextClass,
  };
};

NotificationList.propTypes = {
  notificationsToShow: PropTypes.arrayOf(PropTypes.object).isRequired,
  contextClass: PropTypes.string.isRequired,
};

export default connect(mapStateToProps)(NotificationList);
